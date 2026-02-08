import { type GetBillingHistory, type GetCreditUsageHistory, type GetSubscriptionPlans } from 'wasp/server/operations';
import { HttpError } from 'wasp/server';
import { type Payment, type CreditUsage } from 'wasp/entities';
import { paymentPlans, PaymentPlanId, prettyPaymentPlanName, SubscriptionTier } from '../../payment/plans';
import { createSystemClient } from '../securetagClient';

/**
 * Obtiene el historial de pagos del usuario logueado.
 */
export const getBillingHistory: GetBillingHistory<void, Payment[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Payment.findMany({
    where: {
      userId: context.user.id,
      status: 'COMPLETED', // Solo mostramos pagos exitosos al usuario
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20, // Paginación simple
  });
};

/**
 * Obtiene el historial de uso de créditos (Ledger).
 */
export const getCreditUsageHistory: GetCreditUsageHistory<void, (CreditUsage & { payment: { paypalOrderId: string | null } | null })[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  // --- AUTO-SYNC LOGIC START ---
  if (context.user.securetagUserId) {
      try {
          const client = createSystemClient(context.user.securetagUserId);
          const response = await client.get('/dashboard/stats'); // Endpoint ligero que devuelve créditos
          const backendCredits = response.data.stats?.credits;
          const localCredits = context.user.credits;

          if (typeof backendCredits === 'number' && backendCredits !== localCredits) {
              const diff = backendCredits - localCredits;
              if (diff > 0) {
                  // Registrar Reembolso detectado
                  await context.entities.CreditUsage.create({
                      data: {
                          amount: diff,
                          type: 'REFUND',
                          description: 'Automatic refund for unused or failed services',
                          userId: context.user.id
                      }
                  });
                  // Actualizar usuario local
                  await context.entities.User.update({
                      where: { id: context.user.id },
                      data: { credits: backendCredits }
                  });
                  console.log(`[Billing] Synced credits: Local updated to ${backendCredits} (Refund: +${diff})`);
              }
          }
      } catch (e: any) {
          // Fallo silencioso del sync para no romper la UI si el Core está caído
          console.warn('[Billing] Auto-sync failed:', e.message);
      }
  }
  // --- AUTO-SYNC LOGIC END ---

  return context.entities.CreditUsage.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
    include: {
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
          currency: true,
          paypalOrderId: true,
          paymentType: true,
        },
      },
    },
  });
};

/**
 * Obtiene los planes de suscripción disponibles con sus IDs de PayPal.
 */
export const getSubscriptionPlans: GetSubscriptionPlans<void, any[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  // Definición de planes (podría moverse a una DB o config más robusta)
  return [
    {
      id: PaymentPlanId.Premium,
      name: prettyPaymentPlanName(PaymentPlanId.Premium),
      price: 19.00,
      description: 'Professional users and small teams.',
      features: [' Unlimited projects', ' Advacned AI rules', 'Priority support', 'Acces to Deep Code Vision'],
      paypalPlanId: paymentPlans[PaymentPlanId.Premium].getPaymentProcessorPlanId(),
      tier: SubscriptionTier.PREMIUM,
      popular: true
    },
    {
      id: PaymentPlanId.Enterprise,
      name: prettyPaymentPlanName(PaymentPlanId.Enterprise),
      price: 99.00,
      description: 'For big orgs and enterprise-level needs.',
      features: ['Access to all features', 'Dedicated Account Manager', 'Advanced Audit Tools', '24/7 Customer Support'],
      paypalPlanId: paymentPlans[PaymentPlanId.Enterprise].getPaymentProcessorPlanId(),
      tier: SubscriptionTier.ENTERPRISE,
      popular: false
    }
  ];
};

/**
 * Obtiene el detalle de un pago para generar recibo.
 */
export const getPaymentReceipt = async (args: { paymentId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const payment = await context.entities.Payment.findUnique({
    where: {
      id: args.paymentId,
    },
    include: {
      user: {
        select: {
          email: true,
          username: true
        }
      }
    }
  });

  if (!payment) {
    throw new HttpError(404, 'Payment not found');
  }

  if (payment.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized access to this receipt');
  }

  return payment;
};
