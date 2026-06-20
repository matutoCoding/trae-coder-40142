import dayjs from 'dayjs';
import type { CommissionRule, CommissionSplit, BillItem } from './types';

let splitCounter = 0;

export function splitCommission(
  bill: BillItem,
  rule: CommissionRule
): CommissionSplit {
  splitCounter++;
  const totalAmount = bill.totalAmount;
  const apartmentIncome = Math.round(totalAmount * rule.apartmentShare * 100) / 100;
  const landlordIncome = Math.round(totalAmount * rule.landlordShare * 100) / 100;

  const roundingDiff = Math.round((totalAmount - apartmentIncome - landlordIncome) * 100) / 100;
  const adjustedApartmentIncome = Math.round((apartmentIncome + roundingDiff) * 100) / 100;

  return {
    billId: bill.id,
    apartmentId: bill.apartmentId,
    landlordId: rule.landlordId,
    landlordName: rule.landlordName,
    totalAmount,
    apartmentIncome: adjustedApartmentIncome,
    landlordIncome,
    apartmentShare: rule.apartmentShare,
    landlordShare: rule.landlordShare,
    splitAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
}

export function batchSplitCommission(
  bills: BillItem[],
  ruleMap: Map<string, CommissionRule>
): CommissionSplit[] {
  return bills.map((bill) => {
    const rule = ruleMap.get(bill.apartmentId);
    if (!rule) {
      throw new Error(`未找到公寓 ${bill.apartmentId} 的抽成规则`);
    }
    return splitCommission(bill, rule);
  });
}

export function aggregateIncomeByParty(
  splits: CommissionSplit[]
): { apartmentIncome: number; landlordIncomes: Map<string, { name: string; income: number }> } {
  let apartmentIncome = 0;
  const landlordIncomes = new Map<string, { name: string; income: number }>();

  for (const split of splits) {
    apartmentIncome += split.apartmentIncome;

    const existing = landlordIncomes.get(split.landlordId);
    if (existing) {
      existing.income += split.landlordIncome;
    } else {
      landlordIncomes.set(split.landlordId, {
        name: split.landlordName,
        income: split.landlordIncome,
      });
    }
  }

  apartmentIncome = Math.round(apartmentIncome * 100) / 100;
  for (const [, value] of landlordIncomes) {
    value.income = Math.round(value.income * 100) / 100;
  }

  return { apartmentIncome, landlordIncomes };
}
