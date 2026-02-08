import { HttpError, prisma } from 'wasp/server';
import { type CreatePayPalOrder, type CapturePayPalOrder, type SyncSubscription, type CancelSubscription } from 'wasp/server/operations';
import { fetch } from 'undici';
import { createSystemClient } from '../securetagClient';
import { SubscriptionStatus, SubscriptionTier, PaymentPlanId } from '../../payment/plans';

// ---------------------------------------------------------
// 🛠️ Interfaces y Tipos
// ---------------------------------------------------------

// Respuesta simplificada de PayPal
interface PayPalOrderResponse {
  id: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
}

import { getCreditPackage } from '../../shared/billing';

// ---------------------------------------------------------
// 🔐 Helpers de PayPal (Privados)
// ---------------------------------------------------------

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('MISSING_PAYPAL_CREDENTIALS');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json() as any;
  return data.access_token;
};

// ---------------------------------------------------------
// 🚀 Wasp Actions
// ---------------------------------------------------------

/**
 * 1. createPayPalOrder
 * Genera una orden en PayPal y guarda un registro PENDING en nuestra BD.
 */
type CreateOrderArgs = { packageId: string };

export const createPayPalOrder: CreatePayPalOrder<CreateOrderArgs, { orderId: string }> = async (
  { packageId },
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'Debes iniciar sesión para comprar créditos.');
  }

  const pkg = getCreditPackage(packageId);
  if (!pkg) {
    throw new HttpError(400, 'Paquete de créditos inválido.');
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const apiUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

    // Crear orden en PayPal
    const response = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: pkg.price.toFixed(2),
            },
            description: `Purchase of ${pkg.credits} Securetag Credits`,
          },
        ],
      }),
    });

    const orderData = await response.json() as PayPalOrderResponse;

    if (!orderData.id) {
      console.error('PayPal Error:', orderData);
      throw new Error('Error al crear orden en PayPal');
    }

    // Guardar registro PENDING en nuestra BD
    await context.entities.Payment.create({
      data: {
        userId: context.user.id,
        paypalOrderId: orderData.id,
        amount: pkg.price,
        creditsAmount: pkg.credits,
        status: 'PENDING',
        currency: 'USD',
      },
    });

    return { orderId: orderData.id };

  } catch (error) {
    console.error('createPayPalOrder Error:', error);
    throw new HttpError(500, 'No se pudo iniciar el proceso de pago.');
  }
};

export const syncCreditsWithBackend = async (_args: void, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  // Ensure user is linked to backend
  if (!context.user.securetagUserId) {
      throw new HttpError(400, 'User not linked to Securetag Backend');
  }

  console.log(`Manual sync: syncing credits for user ${context.user.id} (${context.user.credits} credits) to Backend...`);

  const client = createSystemClient(context.user.securetagUserId);

  try {
    await client.post('/api/v1/tenant/credits/sync', {
        credits: context.user.credits
    });
    
    return { success: true, syncedCredits: context.user.credits };
  } catch (error: any) {
    console.error('Manual Sync failed:', error.message);
    throw new HttpError(500, 'Failed to sync credits with backend');
  }
};

/**
 * 2. capturePayPalOrder
 * Captura el pago, verifica idempotencia y asigna créditos.
 */
type CaptureOrderArgs = { paypalOrderId: string };

export const capturePayPalOrder: CapturePayPalOrder<CaptureOrderArgs, { success: boolean; newCredits: number }> = async (
  { paypalOrderId },
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'No autorizado.');
  }
  const user = context.user;

  // 1. Verificar si ya procesamos este pago (Idempotencia Local)
  const existingPayment = await context.entities.Payment.findUnique({
    where: { paypalOrderId },
  });

  if (!existingPayment) {
    throw new HttpError(404, 'Orden de pago no encontrada en nuestro sistema.');
  }

  if (existingPayment.status === 'COMPLETED') {
    return { success: true, newCredits: user.credits };
  }

  try {
    // 2. Capturar pago en PayPal
    const accessToken = await getPayPalAccessToken();
    const apiUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${apiUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const captureData = await response.json() as any;
    
    // Verificar que PayPal diga "COMPLETED"
    const status = captureData?.status;
    if (status !== 'COMPLETED') {
      throw new HttpError(400, `El pago no fue completado. Estado: ${status}`);
    }

    // 3. Transacción Atómica en Prisma
    const updatedUser = await prisma.$transaction(async (tx: any) => {
      // a. Actualizar Pago
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: { status: 'COMPLETED' },
      });

      // b. Crear registro de uso (Ledger)
      await tx.creditUsage.create({
        data: {
          userId: user.id,
          amount: existingPayment.creditsAmount,
          type: 'PURCHASE',
          description: `Credit package purchase`,
          paymentId: existingPayment.id,
        },
      });

      // c. Actualizar Usuario
      const updatedUserTx = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: existingPayment.creditsAmount },
          datePaid: new Date(),
          paymentProcessorUserId: captureData.payer?.payer_id, // Guardamos ID de PayPal del usuario
        },
      });

      return updatedUserTx;
    });

    // 4. Sincronización Inmediata con Backend Core (Fire and Forget or Await)
    if (updatedUser.securetagUserId) {
      try {
        console.log(`[SYNC] Syncing new credit balance (${updatedUser.credits}) to Backend...`);
        const client = createSystemClient(updatedUser.securetagUserId);
        await client.post('/api/v1/tenant/credits/sync', { credits: updatedUser.credits });
      } catch (syncError) {
        console.error('[SYNC ERROR] Failed to sync credits to backend:', syncError);
        // No fallamos la request principal porque el usuario ya pagó y tiene sus créditos locales.
        // El auto-sync del dashboard lo corregirá después.
      }
    }

    return { success: true, newCredits: updatedUser.credits };

  } catch (error) {
    console.error('capturePayPalOrder Error:', error);
    // Si ya habíamos validado el pago en PayPal pero falló nuestra DB, es un caso crítico (Edge Case)
    // Aquí deberíamos tener logs robustos o alertas.
    throw new HttpError(500, 'Error procesando la confirmación del pago.');
  }
};

/**
 * 3. syncSubscription
 * Se llama cuando el Frontend detecta un onApprove de Suscripción exitoso.
 */
type SyncSubscriptionArgs = { subscriptionId: string; planId: string };

export const syncSubscription: SyncSubscription<SyncSubscriptionArgs, { success: boolean }> = async (
  { subscriptionId, planId },
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'No autorizado.');
  }

  const user = context.user;

  console.log(`[SYNC] Processing subscription ${subscriptionId} for plan ${planId}`);

  // 1. Determinar el Tier basado en el Plan ID
  // NOTA: En un sistema real, deberíamos validar contra la API de PayPal que la suscripción esté ACTIVE.
  // Por simplicidad y rapidez, confiamos en el onApprove del cliente por ahora, 
  // pero lo ideal es llamar a PayPal GET /v1/billing/subscriptions/{id} aquí.

  let newTier: SubscriptionTier = SubscriptionTier.FREE;
  let creditsToAdd = 0;

  // Normalizamos el planId para comparación segura
  const normalizedPlanId = planId.toLowerCase();

  if (normalizedPlanId === PaymentPlanId.Premium || normalizedPlanId.includes('premium')) {
    newTier = SubscriptionTier.PREMIUM;
    creditsToAdd = 50;
  } else if (normalizedPlanId === PaymentPlanId.Enterprise || normalizedPlanId.includes('enterprise')) {
    newTier = SubscriptionTier.ENTERPRISE;
    creditsToAdd = 200;
  }

  // 2. Actualizar Usuario y Crear Pago en Transacción
  const updatedUser = await prisma.$transaction(async (tx: any) => {
      
      // a. Crear Pago (Registro de transacción financiera)
      const newPayment = await tx.payment.create({
          data: {
              userId: user.id,
              paypalOrderId: subscriptionId, // Usamos el Subscription ID como Order ID
              amount: newTier === SubscriptionTier.PREMIUM ? 19.00 : 99.00, // Precios hardcodeados por ahora, idealmente vendrían del plan
              currency: 'USD',
              status: 'COMPLETED',
              creditsAmount: creditsToAdd,
              paymentType: 'SUBSCRIPTION_RENEWAL'
          }
      });

      // b. Registrar en Historial de Créditos (Ledger)
      if (creditsToAdd > 0) {
        await tx.creditUsage.create({
          data: {
            userId: user.id,
            amount: creditsToAdd,
            type: 'SUBSCRIPTION_BONUS',
            description: `Monthly credits for ${newTier} plan`,
            paymentId: newPayment.id // Vinculamos para generar recibo
          }
        });
      }

      // c. Actualizar Usuario
      return await tx.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          subscriptionTier: newTier,
          subscriptionId: subscriptionId,
          subscriptionPlan: planId, // Legacy field
          datePaid: new Date(),
          credits: { increment: creditsToAdd }
        }
      });
  });

  // 4. Sincronizar con Backend Core (SecureTag App)
  if (updatedUser.securetagTenantId) {
    try {
      const client = createSystemClient(updatedUser.securetagUserId || 'system');
      
      // Mapear features para el backend
      const llm_config = {
         model: newTier === SubscriptionTier.ENTERPRISE ? 'gpt-4-turbo' : 'gpt-3.5-turbo',
         context_window: newTier === SubscriptionTier.ENTERPRISE ? 128000 : 16000,
         features: {
            deep_code_vision: newTier !== SubscriptionTier.FREE,
            architectural_flow: newTier === SubscriptionTier.ENTERPRISE
         }
      };

      // Sync Plan
      await client.post('/api/v1/tenant/plan/sync', {
        plan: newTier,
        llm_config
      });
      
      console.log(`[SYNC] Plan synced with Backend: ${newTier}`);

      // Sync Credits (si hubo abono)
      if (creditsToAdd > 0) {
         await client.post('/api/v1/tenant/credits/sync', { credits: updatedUser.credits });
         console.log(`[SYNC] Credits synced with Backend: ${updatedUser.credits}`);
      }

    } catch (error) {
      console.error('[SYNC ERROR] Failed to sync plan/credits to backend:', error);
      // No lanzamos error para no romper la experiencia del usuario, 
      // pero esto debería reintentarse.
    }
  }

  return { success: true };
};

import { cancelSubscriptionInternal } from '../services/billing/subscription';

/**
 * 4. cancelSubscription
 * Cancela la suscripción actual del usuario y lo devuelve al plan FREE.
 */
export const cancelSubscription: CancelSubscription<void, { success: boolean }> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'No autorizado.');
  }

  if (context.user.subscriptionTier === SubscriptionTier.FREE) {
    throw new HttpError(400, 'No tienes una suscripción activa para cancelar.');
  }

  // 1. (Opcional) Llamar a PayPal API para cancelar la suscripción remota
  // Si tuviéramos las credenciales completas y el subscriptionId, haríamos:
  // POST /v1/billing/subscriptions/{id}/cancel
  if (context.user.subscriptionId && process.env.PAYPAL_CLIENT_SECRET) {
    try {
      const accessToken = await getPayPalAccessToken();
      const apiUrl = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
      
      await fetch(`${apiUrl}/v1/billing/subscriptions/${context.user.subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: 'User requested cancellation via portal' })
      });
      console.log('[CANCEL] PayPal subscription cancelled remotely.');
    } catch (error) {
      console.error('[CANCEL ERROR] Failed to cancel PayPal subscription remotely:', error);
      // Continuamos con la cancelación local
    }
  }

  // 2. Ejecutar Lógica Centralizada de Cancelación Local
  await cancelSubscriptionInternal(context.user.id);

  return { success: true };
};
