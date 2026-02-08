import { SubscriptionTier } from "../payment/plans";

// ==========================================
// 1. Economía de Créditos (Credit Economy)
// ==========================================

export const SAST_COSTS = {
  BASE_SCAN: 5,
  DOUBLE_CHECK: {
    standard: 1,
    pro: 2,
    max: 3,
  },
  CUSTOM_RULES: {
    PROCESSING_FEE: 1, // Costo por intento de generación (siempre se cobra)
    SUCCESS_FEE: {
      standard: 2,
      pro: 4,
      max: 9,
    },
  },
};

// ==========================================
// 2. Límites y Capacidades (Capabilities)
// ==========================================

export interface PlanLimits {
  maxFileSizeMb: number;
  allowedModels: string[];
  features: {
    deepCodeVision: boolean;
    architecturalFlow: boolean;
    customRules: boolean;
  };
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  [SubscriptionTier.FREE]: {
    maxFileSizeMb: 10,
    allowedModels: [], // No custom rules
    features: {
      deepCodeVision: false,
      architecturalFlow: false,
      customRules: false,
    },
  },
  [SubscriptionTier.PREMIUM]: {
    maxFileSizeMb: 50,
    allowedModels: ["standard", "pro"],
    features: {
      deepCodeVision: true,
      architecturalFlow: false,
      customRules: true,
    },
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxFileSizeMb: 200,
    allowedModels: ["standard", "pro", "max"],
    features: {
      deepCodeVision: true,
      architecturalFlow: true,
      customRules: true,
    },
  },
};

/**
 * Calcula el costo total estimado (Worst-Case Scenario) para una operación.
 * Se usa tanto en el Frontend (Calculadora) como en el Backend (Validación).
 */
export function calculateScanCost(options: {
  doubleCheckLevel?: string; // 'standard', 'pro', 'max'
  customRules?: boolean;
  customRulesQty?: number;
  customRulesModel?: string; // 'standard', 'pro', 'max'
}): { total: number; breakdown: any } {
  let total = SAST_COSTS.BASE_SCAN;
  const breakdown: any = { base: SAST_COSTS.BASE_SCAN };

  // 1. Double Check
  if (options.doubleCheckLevel) {
    const level = options.doubleCheckLevel as keyof typeof SAST_COSTS.DOUBLE_CHECK;
    const cost = SAST_COSTS.DOUBLE_CHECK[level] || 0;
    if (cost > 0) {
      total += cost;
      breakdown.doubleCheck = {
        cost: cost,
        level: level
      };
    }
  }

  // 2. Custom Rules (Worst Case: Processing + Success Fee)
  if (options.customRules && options.customRulesQty && options.customRulesQty > 0) {
    const qty = options.customRulesQty;
    const processingFee = qty * SAST_COSTS.CUSTOM_RULES.PROCESSING_FEE;
    
    // Determinar Success Fee según modelo
    const model = (options.customRulesModel || "standard") as keyof typeof SAST_COSTS.CUSTOM_RULES.SUCCESS_FEE;
    const successFeePerRule = SAST_COSTS.CUSTOM_RULES.SUCCESS_FEE[model] || SAST_COSTS.CUSTOM_RULES.SUCCESS_FEE.standard;
    const potentialSuccessFee = qty * successFeePerRule;

    total += processingFee + potentialSuccessFee;
    
    breakdown.customRules = {
      qty: qty,
      processing: processingFee,
      potentialSuccess: potentialSuccessFee,
      total: processingFee + potentialSuccessFee,
      cost: processingFee + potentialSuccessFee
    };
  }

  return { total, breakdown };
}
