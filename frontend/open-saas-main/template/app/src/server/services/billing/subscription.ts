import { prisma, HttpError } from 'wasp/server';
import { createSystemClient } from '../../securetagClient';
import { SubscriptionTier, SubscriptionStatus } from '../../../payment/plans';

/**
 * Cancela una suscripción localmente y sincroniza el downgrade con el backend.
 * Esta lógica es compartida entre la acción de usuario y el webhook de PayPal.
 */
export async function cancelSubscriptionInternal(userId: string, subscriptionIdFromWebhook?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Si viene del webhook, validamos que coincida el ID (sanity check)
  if (subscriptionIdFromWebhook && user.subscriptionId !== subscriptionIdFromWebhook) {
    console.warn(`[CANCEL WARNING] Webhook subscription ID (${subscriptionIdFromWebhook}) does not match user subscription ID (${user.subscriptionId}). Proceeding anyway as safety measure.`);
  }

  console.log(`[CANCEL] Processing cancellation for user ${user.id}`);

  // 1. Actualizar Usuario Localmente
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: SubscriptionStatus.CANCELLED,
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionId: null,
      nextBillingDate: null,
    }
  });

  // 2. Sincronizar con Backend Core
  if (updatedUser.securetagTenantId) {
    try {
      const client = createSystemClient(updatedUser.securetagUserId || 'system');
      
      const llm_config = {
         model: 'gpt-3.5-turbo',
         context_window: 4096,
         features: {
            deep_code_vision: false,
            architectural_flow: false
         }
      };

      await client.post('/api/v1/tenant/plan/sync', {
        plan: SubscriptionTier.FREE,
        llm_config
      });
      
      console.log(`[SYNC] Downgrade synced with Backend: FREE`);
    } catch (error) {
      console.error('[SYNC ERROR] Failed to sync downgrade to backend:', error);
      // No re-lanzamos el error porque la cancelación local es prioritaria
    }
  }

  return { success: true };
}

/**
 * Renueva una suscripción: Asigna créditos, registra pago y sincroniza.
 */
export async function renewSubscriptionInternal(
  userId: string, 
  creditsToAdd: number, 
  transactionId: string, 
  amountPaid: number,
  currency: string
) {
  // 1. Transacción Atómica
  const updatedUser = await prisma.$transaction(async (tx) => {
    // a. Registrar Pago Real
    const payment = await tx.payment.create({
      data: {
        userId: userId,
        paypalOrderId: transactionId,
        amount: amountPaid,
        currency: currency,
        status: 'COMPLETED',
        creditsAmount: creditsToAdd,
        paymentType: 'SUBSCRIPTION_RENEWAL'
      }
    });

    // b. Registrar Uso (Ledger)
    await tx.creditUsage.create({
      data: {
        userId: userId,
        amount: creditsToAdd,
        type: 'SUBSCRIPTION_RENEWAL',
        description: `Renovación mensual automática (Tx: ${transactionId})`,
        paymentId: payment.id
      }
    });

    // c. Actualizar Usuario
    return await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: creditsToAdd },
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        datePaid: new Date(),
      }
    });
  });

  console.log(`[RENEW] Renewed credits for user ${userId}. Added ${creditsToAdd} credits.`);

  // 2. Sincronizar con Backend Core
  if (updatedUser.securetagTenantId) {
    try {
        const client = createSystemClient(updatedUser.securetagUserId || 'system');
        await client.post('/api/v1/tenant/credits/sync', { credits: updatedUser.credits });
        console.log(`[SYNC] Synced new balance to backend.`);
    } catch (error) {
        console.error(`[SYNC ERROR] Failed to sync with backend:`, error);
    }
  }

  return updatedUser;
}
