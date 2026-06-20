import type {
  DiscountRule,
  DiscountCalcStep,
  DiscountCalcResult,
  DiscountOrderConfig,
} from './types';

export const DEFAULT_DISCOUNT_ORDER: DiscountOrderConfig = {
  apartmentId: 'default',
  order: [],
};

function applyCoupon(
  amount: number,
  config: { amount: number; minSpend: number }
): number {
  if (amount >= config.minSpend) {
    return Math.min(config.amount, amount);
  }
  return 0;
}

function applyFullReduction(
  amount: number,
  config: { threshold: number; reduction: number }
): number {
  if (amount >= config.threshold) {
    return Math.min(config.reduction, amount);
  }
  return 0;
}

function applyPercentage(
  amount: number,
  config: { percent: number; maxDiscount: number; minSpend: number }
): number {
  if (amount >= config.minSpend) {
    const discount = amount * (config.percent / 100);
    return Math.min(discount, config.maxDiscount, amount);
  }
  return 0;
}

function applyFixed(
  amount: number,
  config: { amount: number }
): number {
  return Math.min(config.amount, amount);
}

export function calcSingleDiscount(amount: number, rule: DiscountRule): number {
  switch (rule.type) {
    case 'COUPON':
      return applyCoupon(amount, rule.config as { amount: number; minSpend: number });
    case 'FULL_REDUCTION':
      return applyFullReduction(amount, rule.config as { threshold: number; reduction: number });
    case 'PERCENTAGE':
      return applyPercentage(amount, rule.config as { percent: number; maxDiscount: number; minSpend: number });
    case 'FIXED':
      return applyFixed(amount, rule.config as { amount: number });
    default:
      return 0;
  }
}

export function calculateDiscounts(
  originalAmount: number,
  rules: DiscountRule[],
  orderConfig?: DiscountOrderConfig
): DiscountCalcResult {
  const enabledRules = rules.filter((r) => r.enabled);

  let ordered: DiscountRule[];
  if (orderConfig && orderConfig.order.length > 0) {
    const ruleMap = new Map(enabledRules.map((r) => [r.id, r]));
    const orderedList: DiscountRule[] = [];
    for (const id of orderConfig.order) {
      const rule = ruleMap.get(id);
      if (rule) {
        orderedList.push(rule);
        ruleMap.delete(id);
      }
    }
    const remaining = Array.from(ruleMap.values()).sort(
      (a, b) => a.priority - b.priority
    );
    ordered = [...orderedList, ...remaining];
  } else {
    ordered = [...enabledRules].sort((a, b) => a.priority - b.priority);
  }

  const steps: DiscountCalcStep[] = [];
  let currentAmount = originalAmount;
  let totalDiscount = 0;
  let negFloorApplied = false;

  for (const rule of ordered) {
    const discountAmount = calcSingleDiscount(currentAmount, rule);
    const amountAfterStep = currentAmount - discountAmount;

    steps.push({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      amountBefore: currentAmount,
      discountAmount,
      amountAfterStep: amountAfterStep,
      amountAfter: Math.max(0, amountAfterStep),
    });

    currentAmount = Math.max(0, amountAfterStep);
    totalDiscount += discountAmount;

    if (amountAfterStep < 0) {
      negFloorApplied = true;
    }
  }

  if (currentAmount < 0) {
    negFloorApplied = true;
    currentAmount = 0;
  }

  return {
    originalAmount,
    totalDiscount: originalAmount - currentAmount,
    finalAmount: currentAmount,
    steps,
    negFloorApplied,
  };
}

export function validateDiscountStacking(
  originalAmount: number,
  rules: DiscountRule[],
  orderConfig?: DiscountOrderConfig
): { valid: boolean; message: string; result: DiscountCalcResult } {
  const result = calculateDiscounts(originalAmount, rules, orderConfig);

  if (result.negFloorApplied) {
    return {
      valid: false,
      message: `优惠叠加后金额为负，已自动兜底为0。原始金额：${originalAmount}，总优惠：${result.totalDiscount}`,
      result,
    };
  }

  return {
    valid: true,
    message: '优惠计算正常',
    result,
  };
}
