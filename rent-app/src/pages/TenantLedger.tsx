import React, { useMemo } from 'react';
import { Card, Tag, NavBar } from 'antd-mobile';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { PaymentMethodLabel } from '../core/types';
import type { BillStatus } from '../core/types';
import dayjs from 'dayjs';

const statusColor: Record<BillStatus, string> = {
  PENDING: '#ff8f1f',
  PAID: '#00b578',
  OVERDUE: '#ff3141',
  CANCELLED: '#ccc',
  SETTLED_BY_DEPOSIT: '#722ed1',
};

const statusLabel: Record<BillStatus, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  OVERDUE: '逾期',
  CANCELLED: '已取消',
  SETTLED_BY_DEPOSIT: '押金抵扣',
};

interface LedgerEntry {
  id: string;
  type: 'BILL' | 'DEPOSIT_DEDUCTION' | 'SETTLEMENT';
  date: string;
  month: string;
  description: string;
  amount: number;
  status: BillStatus | string;
  detail: string;
  billId?: string;
  depositId?: string;
  settlementRecordId?: string;
}

const TenantLedger: React.FC = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { tenants, bills, deposits, settlementRecords, settlementPeriods, landlords } = useRentStore();

  const tenant = tenants.find((t) => t.id === tenantId);

  const entries = useMemo(() => {
    if (!tenant) return [];

    const result: LedgerEntry[] = [];

    const tenantBillIds = new Set<string>();
    const tenantBills = bills.filter((b) => b.tenantId === tenantId);
    for (const bill of tenantBills) {
      tenantBillIds.add(bill.id);
      result.push({
        id: bill.id,
        type: 'BILL',
        date: bill.paidAt ?? bill.createdAt,
        month: bill.periodStart.slice(0, 7),
        description: `${bill.periodStart.slice(0, 7)}月租金`,
        amount: bill.totalAmount,
        status: bill.status,
        detail: bill.paymentInfo
          ? `${PaymentMethodLabel[bill.paymentInfo.method]}${bill.paymentInfo.remark ? ` · ${bill.paymentInfo.remark}` : ''}`
          : bill.status === 'SETTLED_BY_DEPOSIT'
            ? '押金抵扣结清'
            : bill.status === 'OVERDUE'
              ? `逾期 · 滞纳金 ${formatMoney(bill.lateFee)}`
              : `优惠 -${formatMoney(bill.discountResult.totalDiscount)}`,
        billId: bill.id,
      });
    }

    const tenantDeposits = deposits.filter(
      (d) => d.tenantId === tenantId && d.status !== 'HELD'
    );
    for (const dep of tenantDeposits) {
      result.push({
        id: dep.id,
        type: 'DEPOSIT_DEDUCTION',
        date: dep.processedAt ?? '',
        month: dayjs(dep.processedAt).format('YYYY-MM'),
        description: '押金退还处理',
        amount: -dep.refundAmount,
        status: dep.status,
        detail: `扣减 ${formatMoney(dep.deductions.reduce((s, d) => s + d.amount, 0))}${dep.unpaidAmount > 0 ? ` · 抵欠租 ${formatMoney(dep.unpaidAmount)}` : ''}`,
        depositId: dep.id,
      });
    }

    const tenantLandlordId = tenant.landlordId;
    const landlordName = landlords.find((l) => l.id === tenantLandlordId)?.name ?? '';

    for (const rec of settlementRecords) {
      if (!rec.settledAt) continue;

      const includedTenantBills = (rec.billIds ?? []).filter((bid) => tenantBillIds.has(bid));
      if (includedTenantBills.length === 0) continue;

      const period = settlementPeriods.find((p) => p.id === rec.periodId);
      const periodMonth = period?.yearMonth ?? '';

      if (rec.partyType === 'LANDLORD') {
        const recLandlordId = rec.partyId.replace('LL_', '');
        if (recLandlordId !== tenantLandlordId) continue;
      }

      result.push({
        id: rec.id,
        type: 'SETTLEMENT',
        date: rec.settledAt,
        month: periodMonth,
        description: `结算到账${rec.isSupplementary ? `（补结算第${rec.supplementaryBatch ?? 1}次）` : ''}`,
        amount: rec.finalAmount,
        status: 'SETTLED',
        detail: `${periodMonth} · ${rec.partyType === 'LANDLORD' ? landlordName : '公寓方'} · ${includedTenantBills.length}笔 · ${formatMoney(rec.finalAmount)}`,
        settlementRecordId: rec.id,
      });
    }

    result.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    return result;
  }, [tenant, bills, deposits, settlementRecords, settlementPeriods, landlords]);

  if (!tenant) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>租户台账</NavBar>
        <div className="empty-state">未找到租户</div>
      </div>
    );
  }

  const totalPaid = bills
    .filter((b) => b.tenantId === tenantId && (b.status === 'PAID' || b.status === 'SETTLED_BY_DEPOSIT'))
    .reduce((s, b) => s + b.totalAmount, 0);
  const totalPending = bills
    .filter((b) => b.tenantId === tenantId && b.status === 'PENDING')
    .reduce((s, b) => s + b.totalAmount, 0);
  const totalOverdue = bills
    .filter((b) => b.tenantId === tenantId && b.status === 'OVERDUE')
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="page-tenant-ledger">
      <NavBar onBack={() => navigate(-1)}>租户台账</NavBar>

      <div className="ledger-header">
        <div className="ledger-tenant-name">{tenant.name}</div>
        <div className="ledger-tenant-info">{tenant.roomNumber} · {tenant.phone}</div>
      </div>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-label">已收</div>
          <div className="stat-value success">{formatMoney(totalPaid)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">待收</div>
          <div className="stat-value warning">{formatMoney(totalPending)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">逾期</div>
          <div className="stat-value danger">{formatMoney(totalOverdue)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">台账条目</div>
          <div className="stat-value primary">{entries.length}</div>
        </Card>
      </div>

      <div className="section-title">收租台账</div>
      {entries.length === 0 && <div className="empty-state">暂无台账记录</div>}
      {entries.map((entry) => {
        const typeIcon: Record<string, string> = {
          BILL: '\u{1F4C4}',
          DEPOSIT_DEDUCTION: '\u{1F3E0}',
          SETTLEMENT: '\u{1F4B0}',
        };
        return (
          <Card
            key={entry.id}
            className="ledger-card"
            onClick={() => {
              if (entry.billId) navigate(`/bills/${entry.billId}`);
              else if (entry.settlementRecordId) navigate(`/settlement-detail/${entry.settlementRecordId}`);
            }}
          >
            <div className="ledger-entry">
              <div className="ledger-entry-left">
                <div className="ledger-entry-icon">{typeIcon[entry.type]}</div>
                <div className="ledger-entry-info">
                  <div className="ledger-entry-desc">{entry.description}</div>
                  <div className="ledger-entry-detail">{entry.detail}</div>
                  <div className="ledger-entry-date">{entry.date}</div>
                </div>
              </div>
              <div className="ledger-entry-right">
                <div className={`ledger-entry-amount ${entry.amount < 0 ? 'negative' : 'positive'}`}>
                  {entry.amount < 0 ? '' : '+'}{formatMoney(Math.abs(entry.amount))}
                </div>
                {entry.type === 'BILL' && (
                  <Tag
                    color={statusColor[entry.status as BillStatus] ?? '#ccc'}
                    fill="outline"
                    style={{ fontSize: 10, marginTop: 4 }}
                  >
                    {statusLabel[entry.status as BillStatus] ?? entry.status}
                  </Tag>
                )}
                {entry.type === 'SETTLEMENT' && (
                  <Tag
                    color={entry.status === 'SETTLED' ? '#00b578' : '#ff8f1f'}
                    fill="outline"
                    style={{ fontSize: 10, marginTop: 4 }}
                  >
                    {entry.detail.includes('补结算') ? '补结算' : '已结算'}
                  </Tag>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TenantLedger;
