import dayjs from 'dayjs';
import type {
  CommissionSplit,
  SettlementPeriod,
  SettlementRecord,
  SettlementAdjustment,
} from './types';

function uniqueId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}${ts}${rand}`;
}

export function createSettlementPeriod(
  apartmentId: string,
  yearMonth: string
): SettlementPeriod {
  const startOfMonth = dayjs(yearMonth + '-01');
  return {
    id: uniqueId('SP'),
    apartmentId,
    yearMonth,
    startDate: startOfMonth.format('YYYY-MM-DD'),
    endDate: startOfMonth.endOf('month').format('YYYY-MM-DD'),
    status: 'OPEN',
  };
}

export function reconcilePeriod(
  period: SettlementPeriod,
  splits: CommissionSplit[],
  adjustments: Map<string, SettlementAdjustment[]>
): SettlementRecord[] {
  const apartmentAgg = new Map<string, { totalIncome: number; billCount: number; billIds: string[] }>();
  const landlordAgg = new Map<string, { name: string; income: number; billCount: number; billIds: string[] }>();

  for (const split of splits) {
    if (split.apartmentId !== period.apartmentId) continue;

    const apt = apartmentAgg.get(split.apartmentId) ?? { totalIncome: 0, billCount: 0, billIds: [] };
    apartmentAgg.set(split.apartmentId, {
      totalIncome: apt.totalIncome + split.apartmentIncome,
      billCount: apt.billCount + 1,
      billIds: [...apt.billIds, split.billId],
    });

    const existing = landlordAgg.get(split.landlordId);
    if (existing) {
      existing.income += split.landlordIncome;
      existing.billCount += 1;
      existing.billIds.push(split.billId);
    } else {
      landlordAgg.set(split.landlordId, {
        name: split.landlordName,
        income: split.landlordIncome,
        billCount: 1,
        billIds: [split.billId],
      });
    }
  }

  const records: SettlementRecord[] = [];
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  for (const [aptId, agg] of apartmentAgg) {
    const aptAdjustments = adjustments.get(`APT_${aptId}`) ?? [];
    const adjSum = aptAdjustments.reduce((sum, a) => {
      return sum + (a.type === 'CREDIT' ? a.amount : -a.amount);
    }, 0);
    const finalAmount = Math.max(0, Math.round((agg.totalIncome + adjSum) * 100) / 100);

    records.push({
      id: uniqueId('SR'),
      periodId: period.id,
      apartmentId: aptId,
      partyId: `APT_${aptId}`,
      partyName: '公寓方',
      partyType: 'APARTMENT',
      totalIncome: Math.round(agg.totalIncome * 100) / 100,
      billCount: agg.billCount,
      billIds: agg.billIds,
      adjustments: aptAdjustments,
      finalAmount,
      settledAt: period.status === 'SETTLED' ? now : undefined,
    });
  }

  for (const [landlordId, data] of landlordAgg) {
    const llAdjustments = adjustments.get(`LL_${landlordId}`) ?? [];
    const adjSum = llAdjustments.reduce((sum, a) => {
      return sum + (a.type === 'CREDIT' ? a.amount : -a.amount);
    }, 0);
    const finalAmount = Math.max(0, Math.round((data.income + adjSum) * 100) / 100);

    records.push({
      id: uniqueId('SR'),
      periodId: period.id,
      apartmentId: period.apartmentId,
      partyId: `LL_${landlordId}`,
      partyName: data.name,
      partyType: 'LANDLORD',
      totalIncome: Math.round(data.income * 100) / 100,
      billCount: data.billCount,
      billIds: data.billIds,
      adjustments: llAdjustments,
      finalAmount,
      settledAt: period.status === 'SETTLED' ? now : undefined,
    });
  }

  return records;
}

export function settlePeriod(
  period: SettlementPeriod,
  records: SettlementRecord[]
): { period: SettlementPeriod; records: SettlementRecord[] } {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const settledRecords = records.map((r) => ({
    ...r,
    settledAt: now,
  }));

  return {
    period: { ...period, status: 'SETTLED' as const },
    records: settledRecords,
  };
}

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
