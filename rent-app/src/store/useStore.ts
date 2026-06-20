import { create } from 'zustand';
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
  SettlementPeriod,
  SettlementRecord,
  CommissionSplit,
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
import { splitCommission } from '../core/commissionSplitter';

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
  commissionSplits: CommissionSplit[];
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
  addDeposit: (deposit: DepositRecord) => void;
  updateDepositStatus: (id: string, status: DepositRecord['status']) => void;
  addSettlementPeriod: (period: SettlementPeriod) => void;
  updateSettlementPeriod: (id: string, period: Partial<SettlementPeriod>) => void;
  addSettlementRecord: (record: SettlementRecord) => void;
  recalculateBills: () => void;
  previewDiscount: (amount: number, apartmentId?: string) => ReturnType<typeof calculateDiscounts>;
}

export const useRentStore = create<RentStore>((set, get) => ({
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
  commissionSplits: [],
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
      bills: state.bills.map((b) => (b.id === id ? { ...b, status } : b)),
    })),

  addDeposit: (deposit) =>
    set((state) => ({
      deposits: [...state.deposits, deposit],
    })),

  updateDepositStatus: (id, status) =>
    set((state) => ({
      deposits: state.deposits.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

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

  recalculateBills: () =>
    set((state) => {
      const { discountRules, discountOrder, commissionRules, billingRules } = state;
      const updatedBills = state.bills.map((bill) => {
        const billingRule = billingRules.find((br) => br.apartmentId === bill.apartmentId);
        if (!billingRule) return bill;
        const discountResult = calculateDiscounts(
          billingRule.rentAmount,
          discountRules,
          discountOrder
        );
        const totalAmount = discountResult.finalAmount + bill.lateFee;
        return {
          ...bill,
          rentAmount: billingRule.rentAmount,
          discountResult,
          totalAmount: Math.max(0, totalAmount),
        };
      });

      const updatedSplits = updatedBills.map((bill) => {
        const rule = commissionRules.find((cr) => cr.apartmentId === bill.apartmentId);
        if (!rule) return null;
        return splitCommission(bill, rule);
      }).filter(Boolean) as CommissionSplit[];

      return { bills: updatedBills, commissionSplits: updatedSplits };
    }),

  previewDiscount: (amount, apartmentId) => {
    const { discountRules, discountOrder } = get();
    const order = apartmentId
      ? { ...discountOrder, apartmentId }
      : discountOrder;
    return calculateDiscounts(amount, discountRules, order);
  },
}));
