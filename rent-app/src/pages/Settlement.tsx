import React from 'react';
import { Card, Tag, Button, Dialog } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';

const periodStatusLabel: Record<string, { label: string; color: string }> = {
  OPEN: { label: '待对账', color: '#1677ff' },
  RECONCILING: { label: '对账中', color: '#ff8f1f' },
  SETTLED: { label: '已结算', color: '#00b578' },
};

const Settlement: React.FC = () => {
  const {
    settlementPeriods,
    settlementRecords,
    selectedApartmentId,
    reconcilePeriodAction,
    settlePeriodAction,
  } = useRentStore();

  const apartmentPeriods = settlementPeriods.filter(
    (p) => p.apartmentId === selectedApartmentId
  );

  const apartmentRecords = settlementRecords.filter(
    (r) => r.apartmentId === selectedApartmentId
  );

  const handleReconcile = (periodId: string) => {
    reconcilePeriodAction(periodId);
    Dialog.alert({ content: '对账完成，已生成结算记录' });
  };

  const handleSettle = (periodId: string) => {
    Dialog.confirm({
      content: '确认完成结算？结算后不可修改',
      onConfirm: () => {
        settlePeriodAction(periodId);
        Dialog.alert({ content: '结算完成，已记录到历史' });
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
                    {record.settledAt && (
                      <div className="record-row settled-time-row">
                        <span>结算时间</span>
                        <span className="settled-time">{record.settledAt}</span>
                      </div>
                    )}
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
            <div className="record-row total">
              <span>应结金额</span>
              <span className="final-amount">{formatMoney(record.finalAmount)}</span>
            </div>
            <div className="record-row">
              <span>结算时间</span>
              <span className="settled-time">{record.settledAt}</span>
            </div>
          </Card>
        ))}
    </div>
  );
};

export default Settlement;
