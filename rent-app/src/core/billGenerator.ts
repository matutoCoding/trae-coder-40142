import dayjs from 'dayjs';
import type {
  BillingRule,
  BillItem,
  BillStatus,
  DepositRecord,
  DepositDeduction,
  DiscountRule,
  DiscountOrderConfig,
} from './types';
import { calculateDiscounts } from './discountEngine';

let billCounter = 0;

export function generateBillId(): string {
  billCounter++;
  return `BIL${dayjs().format('YYYYMMDD')}${String(billCounter).padStart(4, '0')}`;
}

export function generateBill(
  billingRule: BillingRule,
  tenantId: string,
  tenantName: string,
  roomNumber: string,
  landlordId: string,
  periodStart: string,
  periodEnd: string,
  discountRules: DiscountRule[],
  orderConfig?: DiscountOrderConfig
): BillItem {
  const discountResult = calculateDiscounts(
    billingRule.rentAmount,
    discountRules,
    orderConfig
  );

  const graceDeadline = dayjs(periodEnd)
    .add(billingRule.graceDays, 'day')
    .format('YYYY-MM-DD');

  const isOverdue = dayjs().isAfter(dayjs(graceDeadline));
  let lateFee = 0;
  if (isOverdue) {
    const overdueDays = dayjs().diff(dayjs(graceDeadline), 'day');
    lateFee = Math.round(
      billingRule.rentAmount * billingRule.lateFeeRate * overdueDays * 100
    ) / 100;
  }

  const totalAmount = discountResult.finalAmount + lateFee;

  let status: BillStatus = 'PENDING';
  if (isOverdue) {
    status = 'OVERDUE';
  }

  return {
    id: generateBillId(),
    apartmentId: billingRule.apartmentId,
    tenantId,
    tenantName,
    roomNumber,
    landlordId,
    periodStart,
    periodEnd,
    dueDate: graceDeadline,
    rentAmount: billingRule.rentAmount,
    discountResult,
    lateFee,
    totalAmount: Math.max(0, totalAmount),
    status,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
}

export function generateMonthlyBills(
  billingRule: BillingRule,
  tenants: { id: string; name: string; roomNumber: string; landlordId: string }[],
  yearMonth: string,
  discountRules: DiscountRule[],
  orderConfig?: DiscountOrderConfig
): BillItem[] {
  const startOfMonth = dayjs(yearMonth + '-01');
  const periodStart = startOfMonth.format('YYYY-MM-DD');
  const periodEnd = startOfMonth.endOf('month').format('YYYY-MM-DD');

  return tenants.map((tenant) =>
    generateBill(
      billingRule,
      tenant.id,
      tenant.name,
      tenant.roomNumber,
      tenant.landlordId,
      periodStart,
      periodEnd,
      discountRules,
      orderConfig
    )
  );
}

let depositCounter = 0;

export function calculateDepositRefund(
  apartmentId: string,
  tenantId: string,
  tenantName: string,
  roomNumber: string,
  depositAmount: number,
  deductions: DepositDeduction[],
  unpaidBillIds: string[] = [],
  unpaidAmount: number = 0
): DepositRecord {
  depositCounter++;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const totalUnpaid = unpaidAmount;
  const refundAmount = Math.max(0, depositAmount - totalDeductions - totalUnpaid);

  let status: DepositRecord['status'];
  if (totalDeductions === 0 && totalUnpaid === 0) {
    status = 'HELD';
  } else if (refundAmount === depositAmount) {
    status = 'FULL_REFUND';
  } else if (refundAmount > 0) {
    status = 'PARTIAL_REFUND';
  } else {
    status = 'FORFEITED';
  }

  return {
    id: `DEP${dayjs().format('YYYYMMDD')}${String(depositCounter).padStart(4, '0')}`,
    apartmentId,
    tenantId,
    tenantName,
    roomNumber,
    depositAmount,
    deductions,
    unpaidBillIds,
    unpaidAmount,
    refundAmount,
    status,
  };
}
