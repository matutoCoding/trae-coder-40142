import React, { useMemo } from 'react';
import { Card, Tag, NavBar } from 'antd-mobile';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { PaymentMethodLabel } from '../core/types';
import type { BillStatus } from '../core/types';

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

const SettlementDetail: React.FC = () => {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { settlementRecords, settlementPeriods, bills, commissionRules } = useRentStore();

  const record = settlementRecords.find((r) => r.id === recordId);

  const period = useMemo(
    () => (record ? settlementPeriods.find((p) => p.id === record.periodId) : null),
    [record, settlementPeriods]
  );

  const includedBills = useMemo(
    () => (record ? bills.filter((b) => (record.billIds ?? []).includes(b.id)) : []),
    [record, bills]
  );

  if (!record || !period) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>结算详情</NavBar>
        <div className="empty-state">未找到结算记录</div>
      </div>
    );
  }

  const landlordBillIds = new Set<string>();
  const aptBillIds = new Set<string>();
  for (const bill of includedBills) {
    const rule = commissionRules.find(
      (cr) => cr.apartmentId === bill.apartmentId && cr.landlordId === bill.landlordId
    );
    if (rule && rule.landlordShare > 0) {
      landlordBillIds.add(bill.id);
    }
    aptBillIds.add(bill.id);
  }

  return (
    <div className="page-settlement-detail">
      <NavBar onBack={() => navigate(-1)}>结算详情</NavBar>

      <div className="settlement-detail-header">
        <div className="detail-title-row">
          <div>
            <div className="detail-period">{period.yearMonth}</div>
            <div className="detail-party">
              {record.partyName}
              <Tag
                color={record.partyType === 'APARTMENT' ? '#1677ff' : '#722ed1'}
                fill="outline"
                style={{ marginLeft: 8, fontSize: 10 }}
              >
                {record.partyType === 'APARTMENT' ? '公寓方' : '房东'}
              </Tag>
            </div>
          </div>
          <div className="detail-badge">
            {record.isSupplementary ? (
              <Tag color="#ff8f1f" fill="outline">补结算第{record.supplementaryBatch ?? 1}次</Tag>
            ) : (
              <Tag color="#00b578" fill="outline">原结算</Tag>
            )}
          </div>
        </div>
      </div>

      <Card className="detail-card">
        <div className="detail-section-title">结算概要</div>
        <div className="detail-row">
          <span>包含账单</span>
          <span>{record.billCount} 笔</span>
        </div>
        <div className="detail-row">
          <span>总收入</span>
          <span>{formatMoney(record.totalIncome)}</span>
        </div>
        {record.adjustments.length > 0 && (
          <div className="detail-adjustments">
            {record.adjustments.map((adj, i) => (
              <div key={i} className="detail-row adjustment">
                <span>{adj.reason}</span>
                <span className={adj.type === 'CREDIT' ? 'credit' : 'debit'}>
                  {adj.type === 'CREDIT' ? '+' : '-'}{formatMoney(adj.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="detail-row total">
          <span>应结金额</span>
          <span className="final-amount">{formatMoney(record.finalAmount)}</span>
        </div>
        <div className="detail-row">
          <span>结算时间</span>
          <span>{record.settledAt ?? '-'}</span>
        </div>
      </Card>

      <Card className="detail-card">
        <div className="detail-section-title">包含账单清单</div>
        {includedBills.length === 0 && (
          <div className="empty-state">无关联账单</div>
        )}
        {includedBills.map((bill) => {
          const rule = commissionRules.find(
            (cr) => cr.apartmentId === bill.apartmentId && cr.landlordId === bill.landlordId
          );
          const aptShare = rule ? Math.round(bill.totalAmount * rule.apartmentShare) / 100 : 0;
          const llShare = rule ? Math.round(bill.totalAmount * rule.landlordShare) / 100 : 0;

          return (
            <div
              key={bill.id}
              className="bill-in-settlement"
              onClick={() => navigate(`/bills/${bill.id}`)}
            >
              <div className="bis-header">
                <div className="bis-tenant">{bill.tenantName} · {bill.roomNumber}</div>
                <Tag
                  color={statusColor[bill.status]}
                  fill="outline"
                  style={{ fontSize: 10 }}
                >
                  {statusLabel[bill.status]}
                </Tag>
              </div>
              <div className="bis-row">
                <span>账单金额</span>
                <span>{formatMoney(bill.totalAmount)}</span>
              </div>
              <div className="bis-row source">
                <span>收款来源</span>
                <span>
                  {bill.status === 'SETTLED_BY_DEPOSIT'
                    ? '押金抵扣'
                    : bill.paymentInfo
                      ? PaymentMethodLabel[bill.paymentInfo.method]
                      : '-'}
                </span>
              </div>
              {rule && (
                <div className="bis-splits">
                  <div className="bis-row split">
                    <span>公寓方 ({(rule.apartmentShare * 100).toFixed(0)}%)</span>
                    <span>{formatMoney(aptShare)}</span>
                  </div>
                  <div className="bis-row split">
                    <span>房东 {rule.landlordName} ({(rule.landlordShare * 100).toFixed(0)}%)</span>
                    <span>{formatMoney(llShare)}</span>
                  </div>
                </div>
              )}
              {bill.paidAt && (
                <div className="bis-row time">
                  <span>收款时间</span>
                  <span>{bill.paidAt}</span>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default SettlementDetail;
