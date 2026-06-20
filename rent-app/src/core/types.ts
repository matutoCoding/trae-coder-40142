export type DiscountType = 'COUPON' | 'FULL_REDUCTION' | 'PERCENTAGE' | 'FIXED';

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  priority: number;
  enabled: boolean;
  config: CouponConfig | FullReductionConfig | PercentageConfig | FixedConfig;
}

export interface CouponConfig {
  amount: number;
  minSpend: number;
  validFrom: string;
  validTo: string;
}

export interface FullReductionConfig {
  threshold: number;
  reduction: number;
  stackable: boolean;
}

export interface PercentageConfig {
  percent: number;
  maxDiscount: number;
  minSpend: number;
}

export interface FixedConfig {
  amount: number;
}

export interface DiscountOrderConfig {
  apartmentId: string;
  order: string[];
}

export interface DiscountCalcStep {
  ruleId: string;
  ruleName: string;
  type: DiscountType;
  amountBefore: number;
  discountAmount: number;
  amountAfterStep: number;
  amountAfter: number;
}

export interface DiscountCalcResult {
  originalAmount: number;
  totalDiscount: number;
  finalAmount: number;
  steps: DiscountCalcStep[];
  negFloorApplied: boolean;
}

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'WECHAT' | 'ALIPAY' | 'CARD';

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: '现金',
  BANK_TRANSFER: '银行转账',
  WECHAT: '微信',
  ALIPAY: '支付宝',
  CARD: '刷卡',
};

export interface PaymentInfo {
  method: PaymentMethod;
  remark?: string;
  transactionNo?: string;
  paidBy?: string;
}

export interface BillingRule {
  id: string;
  apartmentId: string;
  rentAmount: number;
  depositMonths: number;
  paymentDay: number;
  graceDays: number;
  lateFeeRate: number;
}

export interface BillItem {
  id: string;
  apartmentId: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  landlordId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  rentAmount: number;
  discountResult: DiscountCalcResult;
  lateFee: number;
  totalAmount: number;
  status: BillStatus;
  createdAt: string;
  paidAt?: string;
  paymentInfo?: PaymentInfo;
}

export type DepositStatus = 'HELD' | 'PARTIAL_REFUND' | 'FULL_REFUND' | 'FORFEITED';

export interface DepositDeduction {
  reason: string;
  amount: number;
}

export interface DepositRecord {
  id: string;
  apartmentId: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  depositAmount: number;
  deductions: DepositDeduction[];
  unpaidBillIds: string[];
  unpaidAmount: number;
  refundAmount: number;
  status: DepositStatus;
  processedAt?: string;
  processedBy?: string;
  processRemark?: string;
}

export interface CommissionRule {
  id: string;
  apartmentId: string;
  landlordId: string;
  landlordName: string;
  apartmentShare: number;
  landlordShare: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface CommissionSplit {
  billId: string;
  apartmentId: string;
  landlordId: string;
  landlordName: string;
  totalAmount: number;
  apartmentIncome: number;
  landlordIncome: number;
  apartmentShare: number;
  landlordShare: number;
  splitAt: string;
}

export interface SettlementPeriod {
  id: string;
  apartmentId: string;
  yearMonth: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'RECONCILING' | 'SETTLED';
}

export interface SettlementRecord {
  id: string;
  periodId: string;
  apartmentId: string;
  partyId: string;
  partyName: string;
  partyType: 'APARTMENT' | 'LANDLORD';
  totalIncome: number;
  billCount: number;
  adjustments: SettlementAdjustment[];
  finalAmount: number;
  settledAt?: string;
}

export interface SettlementAdjustment {
  reason: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
}

export interface Apartment {
  id: string;
  name: string;
  address: string;
  roomCount: number;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  apartmentId: string;
  roomNumber: string;
  landlordId: string;
  leaseStart: string;
  leaseEnd: string;
}

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  apartmentIds: string[];
}
