import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  PAST_DUE = "PAST_DUE",
  NONE = "NONE",
}

export enum SubscriptionTier {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  ENTERPRISE = "ENTERPRISE",
}

export enum PaymentPlanId {
  Free = "free",
  Premium = "premium",
  Enterprise = "enterprise",
  Credits10 = "credits10",
}

export interface PaymentPlan {
  /**
   * Returns the id under which this payment plan is identified on your payment processor.
   *
   * E.g. price id on Stripe, or variant id on LemonSqueezy.
   */
  getPaymentProcessorPlanId: () => string;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription" }
  | { kind: "credits"; amount: number };

export const paymentPlans = {
  [PaymentPlanId.Free]: {
    getPaymentProcessorPlanId: () => "", // Free plan usually has no processor ID or handled differently
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Premium]: {
    getPaymentProcessorPlanId: () =>
      process.env.PAYMENTS_PREMIUM_SUBSCRIPTION_PLAN_ID || "P-0W6168134M062580ANFIYA7Y",
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Enterprise]: {
    getPaymentProcessorPlanId: () =>
      process.env.PAYMENTS_ENTERPRISE_SUBSCRIPTION_PLAN_ID || "P-0TG03476NE743110SNFIYB7Q",
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Credits10]: {
    getPaymentProcessorPlanId: () =>
      process.env.PAYMENTS_CREDITS_10_PLAN_ID || "P-SANDBOX-CREDITS-10",
    effect: { kind: "credits", amount: 10 },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Free]: "Free",
    [PaymentPlanId.Premium]: "Premium",
    [PaymentPlanId.Enterprise]: "Enterprise",
    [PaymentPlanId.Credits10]: "10 Credits",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}

/**
 * Returns Open SaaS `PaymentPlanId` for some payment provider's plan ID.
 * 
 * Different payment providers track plan ID in different ways.
 * e.g. Stripe price ID, Polar product ID...
 */
export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, plan] of Object.entries(paymentPlans)) {
    if (plan.getPaymentProcessorPlanId() === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
