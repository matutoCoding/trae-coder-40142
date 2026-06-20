import React, { useState, useMemo } from 'react';
import { Card, Tag, Button, Dialog, Picker, Toast } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import type { SettlementPeriod, SettlementRecord } from '../core/types';
import dayjs from 'dayjs';

const periodStatusLabel: Record<string, { label: string; color: string }> = {
  OPEN: { label: '待对账', color: '#1677ff' },
  RECONCILING: { label: '对账中', color: '#ff8f1f' },
  SETTLED: { label: '已结算', color: '#00b578' },
};

const Settlement: React.FC = () => {
  const {
    selectedApartmentId,
    setSelectedApartment,
    reconcilePeriodAction,
    settlePeriodAction,
    createPeriodForMonth,
    reconcileSupplementaryAction,
    apartments,
    landlords,
    bills,
    getSettlementPeriodsByFilter,
  } = useRentStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newPeriodApt, setNewPeriodApt] = useState(selectedApartmentId);
  const [newPeriodMonth, setNewPeriodMonth] = useState(dayjs().format('YYYY-MM'));
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterLandlord, setFilterLandlord] = useState<string>('');
  const [showHistoryFilter, setShowHistoryFilter] = useState(false);

  const apartmentLandlords = landlords.filter((l) => l.apartmentIds.includes(selectedApartmentId));
  const periodsWithRecords = getSettlementPeriodsByFilter(
    selectedApartmentId,
    filterMonth || undefined,
    filterLandlord || undefined
  );

  const settledHistory = useMemo(
    () => periodsWithRecords.filter((p) => p.period.status === 'SETTLED'),
    [periodsWithRecords]
  );

  const openPeriods = useMemo(
    () => periodsWithRecords.filter((p) => p.period.status !== 'SETTLED'),
    [periodsWithRecords]
  );

  const months = [];
  for (let i = -6; i <= 6; i++) {
    const d = dayjs().add(i, 'month');
    months.push({ label: d.format('YYYY年MM月'), value: d.format('YYYY-MM') });
  }

  const handleCreatePeriod = () => {
    const result = createPeriodForMonth(newPeriodApt, newPeriodMonth);
    if (!result) {
      Dialog.alert({ content: '该公寓对应月份已有对账期，无需重复创建' });
    } else {
      setSelectedApartment(newPeriodApt);
      Dialog.alert({ content: `已创建 ${newPeriodMonth} 对账期` });
      setShowCreate(false);
    }
  };

  const handleReconcile = (periodId: string) => {
    reconcilePeriodAction(periodId);
    Dialog.alert({ content: '对账完成，已生成结算记录' });
  };

  const handleSettle = (periodId: string) => {
    Dialog.confirm({
      content: '确认完成结算？结算后将永久留存历史记录，不可修改',
      onConfirm: () => {
        settlePeriodAction(periodId);
        Dialog.alert({ content: '结算完成，已记录到历史结算' });
      },
    });
  };

  const hasNewPayments = (period: SettlementPeriod, periodRecords: SettlementRecord[]) => {
    const settledAtTime = periodRecords.find((r) => r.settledAt)?.settledAt;
    if (!settledAtTime) return false;
    return bills.some(
      (b) =>
        b.apartmentId === period.apartmentId &&
        b.periodStart.startsWith(period.yearMonth) &&
        (b.status === 'PAID' || b.status === 'SETTLED_BY_DEPOSIT') &&
        b.paidAt &&
        dayjs(b.paidAt).isAfter(dayjs(settledAtTime))
    );
  };

  return (
    <div className="page-settlement">
      <div className="page-actions">
        <Button size="small" fill="outline" onClick={() => setShowHistoryFilter(true)}>
          筛选历史
        </Button>
        <Button size="small" color="primary" onClick={() => setShowCreate(true)}>
          + 新建对账期
        </Button>
      </div>

      {(filterMonth || filterLandlord) && (
        <div className="filter-tags">
          {filterMonth && (
            <div className="filter-tag">
              <Tag color="#1677ff" fill="outline">月份: {filterMonth}</Tag>
              <span className="filter-tag-close" onClick={() => setFilterMonth('')}>×</span>
            </div>
          )}
          {filterLandlord && (
            <div className="filter-tag">
              <Tag color="#722ed1" fill="outline">
                房东: {apartmentLandlords.find((l) => l.id === filterLandlord)?.name ?? filterLandlord}
              </Tag>
              <span className="filter-tag-close" onClick={() => setFilterLandlord('')}>×</span>
            </div>
          )}
          <Button size="mini" fill="outline" onClick={() => { setFilterMonth(''); setFilterLandlord(''); }}>
            清除
          </Button>
        </div>
      )}

      <div className="section-title">待对账 / 对账中</div>
      {openPeriods.length === 0 && (
        <div className="empty-state">暂无待处理的对账期，点击右上角新建</div>
      )}
      {openPeriods.map(({ period, records }) => {
        const statusInfo = periodStatusLabel[period.status];
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

            {records.length > 0 && (
              <div className="period-records">
                {records.map((record) => (
                  <div key={record.id} className="settlement-record">
                    <div className="record-header">
                      <span className="record-party">{record.partyName}</span>
                      <Tag
                        color={record.partyType === 'APARTMENT' ? '#1677ff' : '#722ed1'}
                        fill="outline"
                        style={{ fontSize: 10 }}
                      >
                        {record.partyType === 'APARTMENT' ? '公寓方' : `房东·${record.billCount}笔`}
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
                  拉取已收账单对账
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
            </div>
          </Card>
        );
      })}

      <div className="section-title">历史结算记录 ({settledHistory.length})</div>
      {settledHistory.length === 0 && (
        <div className="empty-state">暂无历史结算记录</div>
      )}
      {settledHistory.map(({ period, records }) => (
        <Card key={period.id} className="history-card">
          <div className="history-period-header">
            <span className="history-period-month">{period.yearMonth}</span>
            <Tag color="#00b578" fill="outline">已结算</Tag>
          </div>
          {records.map((record) => (
            <div key={record.id} className="settlement-record">
              <div className="record-header">
                <span className="record-party">{record.partyName}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {record.isSupplementary && (
                    <Tag color="#ff8f1f" fill="outline" style={{ fontSize: 10 }}>补结算</Tag>
                  )}
                  <Tag
                    color={record.partyType === 'APARTMENT' ? '#1677ff' : '#722ed1'}
                    fill="outline"
                    style={{ fontSize: 10 }}
                  >
                    {record.partyType === 'APARTMENT' ? '公寓方' : '房东'}
                  </Tag>
                </div>
              </div>
              <div className="record-row">
                <span>账单数</span>
                <span>{record.billCount} 笔</span>
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
            </div>
          ))}
          {hasNewPayments(period, records) && (
            <div className="period-actions">
              <Button
                size="small"
                color="warning"
                onClick={() => {
                  reconcileSupplementaryAction(period.id);
                  Toast.show('补结算完成');
                }}
              >
                补结算
              </Button>
            </div>
          )}
        </Card>
      ))}

      <Dialog
        visible={showCreate}
        title="新建对账期"
        content={
          <div className="dialog-form">
            <div className="form-item">
              <span>选择公寓</span>
              <Picker
                columns={[apartments.map((a) => ({ label: a.name, value: a.id }))]}
                onConfirm={(v) => setNewPeriodApt(v[0] as string)}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {apartments.find((a) => a.id === newPeriodApt)?.name ?? '选择公寓'}
                  </Button>
                )}
              </Picker>
            </div>
            <div className="form-item">
              <span>选择月份</span>
              <Picker
                columns={[months]}
                onConfirm={(v) => setNewPeriodMonth(v[0] as string)}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {newPeriodMonth}
                  </Button>
                )}
              </Picker>
            </div>
            <div className="form-hint">
              对账期创建后，可拉取该月份已标记为"已收"的账单进行对账。
            </div>
          </div>
        }
        closeOnAction
        onClose={() => setShowCreate(false)}
        actions={[
          { key: "cancel", text: "取消" },
          { key: "confirm", text: "创建", bold: true, onClick: handleCreatePeriod },
        ]}
      />

      <Dialog
        visible={showHistoryFilter}
        title="筛选历史结算"
        content={
          <div className="dialog-form">
            <div className="form-item">
              <span>按月份</span>
              <Picker
                columns={[[{ label: '全部', value: '' }, ...months]]}
                onConfirm={(v) => setFilterMonth((v[0] as string) ?? '')}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {filterMonth || '全部月份'}
                  </Button>
                )}
              </Picker>
            </div>
            <div className="form-item">
              <span>按房东</span>
              <Picker
                columns={[[
                  { label: '全部', value: '' },
                  ...apartmentLandlords.map((l) => ({ label: l.name, value: l.id })),
                ]]}
                onConfirm={(v) => setFilterLandlord((v[0] as string) ?? '')}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {filterLandlord ? apartmentLandlords.find((l) => l.id === filterLandlord)?.name : '全部房东'}
                  </Button>
                )}
              </Picker>
            </div>
          </div>
        }
        closeOnAction
        onClose={() => setShowHistoryFilter(false)}
        actions={[
          { key: "cancel", text: "取消" },
          { key: "confirm", text: "应用筛选", bold: true, onClick: () => setShowHistoryFilter(false) },
        ]}
      />
    </div>
  );
};

export default Settlement;
