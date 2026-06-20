import dayjs from 'dayjs';
import type {
  CommissionSplit,
  SettlementPeriod,
  SettlementRecord,
  SettlementAdjustment,
} from './types';

let periodCounter = 0;
let recordCounter = 0;

export function createSettlementPeriod(
  apartmentId: string,
  yearMonth: string
): SettlementPeriod {
  periodCounter++;
  const startOfMonth = dayjs(yearMonth + '-01');
  return {
    id: `SP${dayjs().format('YYYYMMDD')}${String(periodCounter).padStart(4, '0')}`,
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
  recordCounter++;
  const apartmentAgg = new Map<string, number>();
  const landlordAgg = new Map<string, { name: string; income: number }>();

  for (const split of splits) {
    if (split.apartmentId !== period.apartmentId) continue;

    const aptIncome = apartmentAgg.get(split.apartmentId) ?? 0;
    apartmentAgg.set(split.apartmentId, aptIncome + split.apartmentIncome);

    const existing = landlordAgg.get(split.landlordId);
    if (existing) {
      existing.income += split.landlordIncome;
    } else {
      landlordAgg.set(split.landlordId, {
        name: split.landlordName,
        income: split.landlordIncome,
      });
    }
  }

  const records: SettlementRecord[] = [];
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

  for (const [aptId, totalIncome] of apartmentAgg) {
    const aptAdjustments = adjustments.get(`APT_${aptId}`) ?? [];
    const adjSum = aptAdjustments.reduce((sum, a) => {
      return sum + (a.type === 'CREDIT' ? a.amount : -a.amount);
    }, 0);
    const finalAmount = Math.max(0, Math.round((totalIncome + adjSum) * 100) / 100);

    records.push({
      id: `SR${dayjs().format('YYYYMMDD')}${String(recordCounter++).padStart(4, '0')}`,
      periodId: period.id,
      apartmentId: aptId,
      partyId: `APT_${aptId}`,
      partyName: '公寓方',
      partyType: 'APARTMENT',
      totalIncome: Math.round(totalIncome * 100) / 100,
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
      id: `SR${dayjs().format('YYYYMMDD')}${String(recordCounter++).padStart(4, '0')}`,
      periodId: period.id,
      apartmentId: period.apartmentId,
      partyId: `LL_${landlordId}`,
      partyName: data.name,
      partyType: 'LANDLORD',
      totalIncome: Math.round(data.income * 100) / 100,
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
): SettlementPeriod {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const settledRecords = records.map((r) => ({
    ...r,
    settledAt: now,
  }));

  return {
    ...period,
    status: 'SETTLED' as const,
  };
}

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
