import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import dayjs from 'dayjs';
import type {
  Apartment,
  Tenant,
  Landlord,
  BillingRule,
  DiscountRule,
  DiscountOrderConfig,
  CommissionRule,
  BillItem,
  DepositRecord,
  DepositDeduction,
  SettlementPeriod,
  SettlementRecord,
  CommissionSplit,
  SettlementAdjustment,
  PaymentInfo,
} from '../core/types';
import {
  mockApartments,
  mockTenants,
  mockLandlords,
  mockBillingRules,
  mockDiscountRules,
  mockDiscountOrder,
  mockCommissionRules,
  mockBills,
  mockDeposits,
  mockSettlementPeriods,
  mockSettlementRecords,
} from '../core/mockData';
import { calculateDiscounts } from '../core/discountEngine';
import { generateMonthlyBills } from '../core/billGenerator';
import { splitCommission, aggregateIncomeByParty } from '../core/commissionSplitter';
import { reconcilePeriod, settlePeriod, createSettlementPeriod } from '../core/reconciliator';

interface RentStore {
  apartments: Apartment[];
  tenants: Tenant[];
  landlords: Landlord[];
  billingRules: BillingRule[];
  discountRules: DiscountRule[];
  discountOrder: DiscountOrderConfig;
  commissionRules: CommissionRule[];
  bills: BillItem[];
  deposits: DepositRecord[];
  settlementPeriods: SettlementPeriod[];
  settlementRecords: SettlementRecord[];
  selectedApartmentId: string;

  setSelectedApartment: (id: string) => void;
  updateDiscountRule: (rule: DiscountRule) => void;
  addDiscountRule: (rule: DiscountRule) => void;
  toggleDiscountRule: (id: string) => void;
  updateDiscountOrder: (order: string[]) => void;
  updateBillingRule: (rule: BillingRule) => void;
  updateCommissionRule: (rule: CommissionRule) => void;
  addBill: (bill: BillItem) => void;
  updateBillStatus: (id: string, status: BillItem['status']) => void;
  payBill: (id: string, paymentInfo: PaymentInfo) => void;
  generateBillsForMonth: (apartmentId: string, yearMonth: string) => BillItem[];
  addDeposit: (deposit: DepositRecord) => void;
  updateDeposit: (id: string, deposit: Partial<DepositRecord>) => void;
  processDepositDeductions: (depositId: string, deductions: DepositDeduction[]) => DepositRecord;
  processDepositWithUnpaid: (
    depositId: string,
    deductions: DepositDeduction[],
    unpaidBillIds: string[],
    processedBy?: string,
    remark?: string
  ) => DepositRecord;
  createPeriodForMonth: (apartmentId: string, yearMonth: string) => SettlementPeriod | null;
  addSettlementPeriod: (period: SettlementPeriod) => void;
  updateSettlementPeriod: (id: string, period: Partial<SettlementPeriod>) => void;
  addSettlementRecord: (record: SettlementRecord) => void;
  updateSettlementRecord: (id: string, record: Partial<SettlementRecord>) => void;
  reconcilePeriodAction: (periodId: string) => void;
  settlePeriodAction: (periodId: string) => void;
  previewDiscount: (amount: number, apartmentId?: string) => ReturnType<typeof calculateDiscounts>;
  getCommissionSplits: (apartmentId: string) => CommissionSplit[];
  getLandlordIncomeSummary: (apartmentId: string) => { landlordId: string; landlordName: string; income: number }[];
  getUnpaidBills: (tenantId: string) => BillItem[];
  getSettlementPeriodsByFilter: (apartmentId: string, filterMonth?: string, filterLandlordId?: string) => { period: SettlementPeriod; records: SettlementRecord[] }[];
}

const PERSIST_KEY = 'rent_app_store_v1';

export const useRentStore = create<RentStore>()(
  persist(
    (set, get) => ({
      apartments: mockApartments,
      tenants: mockTenants,
      landlords: mockLandlords,
      billingRules: mockBillingRules,
      discountRules: mockDiscountRules,
      discountOrder: mockDiscountOrder,
      commissionRules: mockCommissionRules,
      bills: mockBills,
      deposits: mockDeposits,
      settlementPeriods: mockSettlementPeriods,
      settlementRecords: mockSettlementRecords,
      selectedApartmentId: 'APT001',

      setSelectedApartment: (id) => set({ selectedApartmentId: id }),

      updateDiscountRule: (rule) =>
        set((state) => ({
          discountRules: state.discountRules.map((r) => (r.id === rule.id ? rule : r)),
        })),

      addDiscountRule: (rule) =>
        set((state) => ({
          discountRules: [...state.discountRules, rule],
        })),

      toggleDiscountRule: (id) =>
        set((state) => ({
          discountRules: state.discountRules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        })),

      updateDiscountOrder: (order) =>
        set((state) => ({
          discountOrder: { ...state.discountOrder, order },
        })),

      updateBillingRule: (rule) =>
        set((state) => ({
          billingRules: state.billingRules.map((r) => (r.id === rule.id ? rule : r)),
        })),

      updateCommissionRule: (rule) =>
        set((state) => ({
          commissionRules: state.commissionRules.map((r) => (r.id === rule.id ? rule : r)),
        })),

      addBill: (bill) =>
        set((state) => ({
          bills: [...state.bills, bill],
        })),

      updateBillStatus: (id, status) =>
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, status, paidAt: status === 'PAID' ? dayjs().format('YYYY-MM-DD HH:mm:ss') : b.paidAt } : b)),
        })),

      payBill: (id, paymentInfo) =>
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? {
            ...b,
            status: 'PAID',
            paidAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            paymentInfo,
          } : b)),
        })),

      generateBillsForMonth: (apartmentId, yearMonth) => {
        const state = get();
        const billingRule = state.billingRules.find((br) => br.apartmentId === apartmentId);
        if (!billingRule) return [];

        const activeTenants = state.tenants.filter(
          (t) => t.apartmentId === apartmentId && dayjs(t.leaseEnd).isAfter(dayjs(yearMonth + '-01'))
        );

        const existingBillsForMonth = state.bills.filter(
          (b) => b.apartmentId === apartmentId && b.periodStart.startsWith(yearMonth)
        );
        const existingTenantIds = new Set(existingBillsForMonth.map((b) => b.tenantId));

        const tenantsToBill = activeTenants.filter((t) => !existingTenantIds.has(t.id));

        if (tenantsToBill.length === 0) return [];

        const newBills = generateMonthlyBills(
          billingRule,
          tenantsToBill.map((t) => ({ id: t.id, name: t.name, roomNumber: t.roomNumber, landlordId: t.landlordId })),
          yearMonth,
          state.discountRules,
          state.discountOrder
        );

        set((state) => ({
          bills: [...state.bills, ...newBills],
        }));

        return newBills;
      },

      addDeposit: (deposit) =>
        set((state) => ({
          deposits: [...state.deposits, deposit],
        })),

      updateDeposit: (id, deposit) =>
        set((state) => ({
          deposits: state.deposits.map((d) => (d.id === id ? { ...d, ...deposit } : d)),
        })),

      processDepositDeductions: (depositId, deductions) => {
        const state = get();
        const deposit = state.deposits.find((d) => d.id === depositId);
        if (!deposit) throw new Error('押金记录不存在');

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const refundAmount = Math.max(0, deposit.depositAmount - totalDeductions);

        let status: DepositRecord['status'];
        if (totalDeductions === 0) {
          status = 'FULL_REFUND';
        } else if (refundAmount > 0) {
          status = 'PARTIAL_REFUND';
        } else {
          status = 'FORFEITED';
        }

        const updated: DepositRecord = {
          ...deposit,
          deductions,
          refundAmount,
          status,
          processedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        };

        set((state) => ({
          deposits: state.deposits.map((d) => (d.id === depositId ? updated : d)),
        }));

        return updated;
      },

      processDepositWithUnpaid: (depositId, deductions, unpaidBillIds, processedBy, remark) => {
        const state = get();
        const deposit = state.deposits.find((d) => d.id === depositId);
        if (!deposit) throw new Error('押金记录不存在');

        const unpaidBills = state.bills.filter((b) => unpaidBillIds.includes(b.id));
        const unpaidAmount = unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0);

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const refundAmount = Math.max(0, deposit.depositAmount - totalDeductions - unpaidAmount);

        let status: DepositRecord['status'];
        if (refundAmount === deposit.depositAmount) {
          status = 'FULL_REFUND';
        } else if (refundAmount > 0) {
          status = 'PARTIAL_REFUND';
        } else {
          status = 'FORFEITED';
        }

        const updated: DepositRecord = {
          ...deposit,
          deductions,
          unpaidBillIds,
          unpaidAmount,
          refundAmount,
          status,
          processedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          processedBy: processedBy ?? '运营人员',
          processRemark: remark,
        };

        set((state) => ({
          deposits: state.deposits.map((d) => (d.id === depositId ? updated : d)),
        }));

        return updated;
      },

      createPeriodForMonth: (apartmentId, yearMonth) => {
        const state = get();
        const existing = state.settlementPeriods.find(
          (p) => p.apartmentId === apartmentId && p.yearMonth === yearMonth
        );
        if (existing) return null;

        const period = createSettlementPeriod(apartmentId, yearMonth);
        set((state) => ({
          settlementPeriods: [...state.settlementPeriods, period],
        }));
        return period;
      },

      addSettlementPeriod: (period) =>
        set((state) => ({
          settlementPeriods: [...state.settlementPeriods, period],
        })),

      updateSettlementPeriod: (id, period) =>
        set((state) => ({
          settlementPeriods: state.settlementPeriods.map((p) =>
            p.id === id ? { ...p, ...period } : p
          ),
        })),

      addSettlementRecord: (record) =>
        set((state) => ({
          settlementRecords: [...state.settlementRecords, record],
        })),

      updateSettlementRecord: (id, record) =>
        set((state) => ({
          settlementRecords: state.settlementRecords.map((r) =>
            r.id === id ? { ...r, ...record } : r
          ),
        })),

      reconcilePeriodAction: (periodId) => {
        const state = get();
        const period = state.settlementPeriods.find((p) => p.id === periodId);
        if (!period) return;

        const periodBills = state.bills.filter(
          (b) => b.apartmentId === period.apartmentId && b.periodStart.startsWith(period.yearMonth) && b.status === 'PAID'
        );

        const splits: CommissionSplit[] = [];
        for (const bill of periodBills) {
          const rule = state.commissionRules.find(
            (cr) => cr.apartmentId === bill.apartmentId && cr.landlordId === bill.landlordId
          );
          if (rule) {
            splits.push(splitCommission(bill, rule));
          }
        }

        const adjustments = new Map<string, SettlementAdjustment[]>();
        const records = reconcilePeriod(period, splits, adjustments);

        const existingRecords = state.settlementRecords.filter((r) => r.periodId === periodId);
        const newRecords = records.filter(
          (r) => !existingRecords.some((sr) => sr.partyId === r.partyId)
        );

        const combined = [
          ...existingRecords.filter((er) => !newRecords.some((nr) => nr.partyId === er.partyId)),
          ...newRecords,
        ];

        set({
          settlementRecords: [
            ...state.settlementRecords.filter((r) => r.periodId !== periodId),
            ...combined,
          ],
          settlementPeriods: state.settlementPeriods.map((p) =>
            p.id === periodId ? { ...p, status: 'RECONCILING' as const } : p
          ),
        });
      },

      settlePeriodAction: (periodId) => {
        const state = get();
        const period = state.settlementPeriods.find((p) => p.id === periodId);
        if (!period) return;

        const periodRecords = state.settlementRecords.filter((r) => r.periodId === periodId);

        const result = settlePeriod(period, periodRecords);

        set({
          settlementPeriods: state.settlementPeriods.map((p) =>
            p.id === periodId ? result.period : p
          ),
          settlementRecords: state.settlementRecords.map((r) => {
            const settled = result.records.find((sr) => sr.id === r.id);
            return settled ? settled : r;
          }),
        });
      },

      previewDiscount: (amount, apartmentId) => {
        const { discountRules, discountOrder } = get();
        const order = apartmentId
          ? { ...discountOrder, apartmentId }
          : discountOrder;
        return calculateDiscounts(amount, discountRules, order);
      },

      getCommissionSplits: (apartmentId) => {
        const state = get();
        const apartmentBills = state.bills.filter((b) => b.apartmentId === apartmentId);
        return apartmentBills.map((bill) => {
          const rule = state.commissionRules.find(
            (cr) => cr.apartmentId === bill.apartmentId && cr.landlordId === bill.landlordId
          );
          if (!rule) return null;
          return splitCommission(bill, rule);
        }).filter((s): s is CommissionSplit => s !== null);
      },

      getLandlordIncomeSummary: (apartmentId) => {
        const splits = get().getCommissionSplits(apartmentId);
        const aggregation = aggregateIncomeByParty(splits);
        return Array.from(aggregation.landlordIncomes.entries()).map(([landlordId, data]) => ({
          landlordId,
          landlordName: data.name,
          income: data.income,
        }));
      },

      getUnpaidBills: (tenantId) => {
        const state = get();
        return state.bills.filter(
          (b) => b.tenantId === tenantId && (b.status === 'PENDING' || b.status === 'OVERDUE')
        );
      },

      getSettlementPeriodsByFilter: (apartmentId, filterMonth, filterLandlordId) => {
        const state = get();
        let periods = state.settlementPeriods.filter((p) => p.apartmentId === apartmentId);
        if (filterMonth) {
          periods = periods.filter((p) => p.yearMonth === filterMonth);
        }
        return periods.map((period) => {
          let records = state.settlementRecords.filter((r) => r.periodId === period.id);
          if (filterLandlordId) {
            records = records.filter(
              (r) => r.partyType === 'APARTMENT' || r.partyId === `LL_${filterLandlordId}`
            );
          }
          return { period, records };
        });
      },
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bills: state.bills,
        deposits: state.deposits,
        settlementPeriods: state.settlementPeriods,
        settlementRecords: state.settlementRecords,
        discountRules: state.discountRules,
        discountOrder: state.discountOrder,
        billingRules: state.billingRules,
        selectedApartmentId: state.selectedApartmentId,
      }),
      version: 1,
    }
  )
);
