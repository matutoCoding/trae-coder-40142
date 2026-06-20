import React, { useMemo } from 'react';
import { Card, Tag, Button, Dialog } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { reconcilePeriod, settlePeriod } from '../core/reconciliator';
import { splitCommission, aggregateIncomeByParty } from '../core/commissionSplitter';
import { formatMoney } from '../core/reconciliator';
import type { CommissionSplit, SettlementAdjustment } from '../core/types';

const periodStatusLabel: Record<string, { label: string; color: string }> = {
  OPEN: { label: '待对账', color: '#1677ff' },
  RECONCILING: { label: '对账中', color: '#ff8f1f' },
  SETTLED: { label: '已结算', color: '#00b578' },
};

const Settlement: React.FC = () => {
  const {
    settlementPeriods,
    settlementRecords,
    bills,
    commissionRules,
    selectedApartmentId,
    updateSettlementPeriod,
    addSettlementRecord,
  } = useRentStore();

  const apartmentPeriods = settlementPeriods.filter(
    (p) => p.apartmentId === selectedApartmentId
  );

  const apartmentRecords = settlementRecords.filter(
    (r) => r.apartmentId === selectedApartmentId
  );

  const handleReconcile = (periodId: string) => {
    const period = settlementPeriods.find((p) => p.id === periodId);
    if (!period) return;

    const periodBills = bills.filter(
      (b) => b.apartmentId === period.apartmentId && b.periodStart.startsWith(period.yearMonth)
    );

    const splits: CommissionSplit[] = [];
    for (const bill of periodBills) {
      const rule = commissionRules.find((cr) => cr.apartmentId === bill.apartmentId);
      if (rule) {
        splits.push(splitCommission(bill, rule));
      }
    }

    const adjustments = new Map<string, SettlementAdjustment[]>();
    const records = reconcilePeriod(period, splits, adjustments);

    for (const record of records) {
      addSettlementRecord(record);
    }
    updateSettlementPeriod(periodId, { status: 'RECONCILING' });

    Dialog.alert({
      content: `对账完成，共生成 ${records.length} 条结算记录`,
    });
  };

  const handleSettle = (periodId: string) => {
    Dialog.confirm({
      content: '确认完成结算？结算后不可修改',
      onConfirm: () => {
        updateSettlementPeriod(periodId, { status: 'SETTLED' });
      },
    });
  };

  return (
    <div className="page-settlement">
      <div className="section-title">对账期间</div>
      {apartmentPeriods.map((period) => {
        const statusInfo = periodStatusLabel[period.status];
        const periodRecords = apartmentRecords.filter((r) => r.periodId === period.id);

        return (
          <Card key={period.id} className="period-card">
            <div className="period-header">
              <div>
                <div className="period-month">{period.yearMonth}</div>
                <div className="period-range">{period.startDate} ~ {period.endDate}</div>
              </div>
              <Tag color={statusInfo.color} fill="outline">
                {statusInfo.label}
              </Tag>
            </div>

            {periodRecords.length > 0 && (
              <div className="period-records">
                {periodRecords.map((record) => (
                  <div key={record.id} className="settlement-record">
                    <div className="record-header">
                      <span className="record-party">{record.partyName}</span>
                      <Tag
                        color={record.partyType === 'APARTMENT' ? '#1677ff' : '#722ed1'}
                        fill="outline"
                        style={{ fontSize: 10 }}
                      >
                        {record.partyType === 'APARTMENT' ? '公寓方' : '房东'}
                      </Tag>
                    </div>
                    <div className="record-row">
                      <span>总收入</span>
                      <span>{formatMoney(record.totalIncome)}</span>
                    </div>
                    {record.adjustments.length > 0 && (
                      <div className="record-adjustments">
                        {record.adjustments.map((adj, i) => (
                          <div key={i} className="record-row adjustment">
                            <span>{adj.reason}</span>
                            <span className={adj.type === 'CREDIT' ? 'credit' : 'debit'}>
                              {adj.type === 'CREDIT' ? '+' : '-'}{formatMoney(adj.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="record-row total">
                      <span>应结金额</span>
                      <span className="final-amount">{formatMoney(record.finalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="period-actions">
              {period.status === 'OPEN' && (
                <Button
                  size="small"
                  color="primary"
                  onClick={() => handleReconcile(period.id)}
                >
                  开始对账
                </Button>
              )}
              {period.status === 'RECONCILING' && (
                <Button
                  size="small"
                  color="success"
                  onClick={() => handleSettle(period.id)}
                >
                  确认结算
                </Button>
              )}
              {period.status === 'SETTLED' && (
                <span className="settled-text">已结算</span>
              )}
            </div>
          </Card>
        );
      })}

      <div className="section-title">历史结算记录</div>
      {apartmentRecords
        .filter((r) => r.settledAt)
        .map((record) => (
          <Card key={record.id} className="history-card">
            <div className="record-header">
              <span className="record-party">{record.partyName}</span>
              <span className="settled-time">{record.settledAt}</span>
            </div>
            <div className="record-row total">
              <span>结算金额</span>
              <span className="final-amount">{formatMoney(record.finalAmount)}</span>
            </div>
          </Card>
        ))}
    </div>
  );
};

export default Settlement;
