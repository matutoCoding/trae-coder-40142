import React, { useState, useMemo } from 'react';
import { Card, Tag, Button, Dialog, Input, Toast, Stepper, CheckList } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { calculateDepositRefund } from '../core/billGenerator';
import type { DepositDeduction, DepositRecord } from '../core/types';

const statusLabel: Record<DepositRecord['status'], { label: string; color: string }> = {
  HELD: { label: '持有中', color: '#1677ff' },
  PARTIAL_REFUND: { label: '部分退还', color: '#ff8f1f' },
  FULL_REFUND: { label: '全额退还', color: '#00b578' },
  FORFEITED: { label: '已没收', color: '#ff3141' },
};

const Deposit: React.FC = () => {
  const {
    deposits,
    tenants,
    bills,
    selectedApartmentId,
    addDeposit,
    processDepositWithUnpaid,
    getUnpaidBills,
    billingRules,
  } = useRentStore();

  const [showRefund, setShowRefund] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string>('');
  const [deductions, setDeductions] = useState<DepositDeduction[]>([]);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState(0);
  const [selectedUnpaidIds, setSelectedUnpaidIds] = useState<string[]>([]);
  const [processRemark, setProcessRemark] = useState('');

  const apartmentDeposits = deposits.filter(
    (d) => d.apartmentId === selectedApartmentId
  );

  const currentBillingRule = billingRules.find((br) => br.apartmentId === selectedApartmentId);

  const tenantsWithoutDeposit = tenants.filter(
    (t) => t.apartmentId === selectedApartmentId && !apartmentDeposits.some((d) => d.tenantId === t.id)
  );

  const selectedDeposit = useMemo(
    () => deposits.find((d) => d.id === selectedDepositId) ?? null,
    [deposits, selectedDepositId]
  );

  const unpaidBills = useMemo(() => {
    if (!selectedDeposit) return [];
    return getUnpaidBills(selectedDeposit.tenantId);
  }, [selectedDeposit, getUnpaidBills]);

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const selectedUnpaidAmount = unpaidBills
    .filter((b) => selectedUnpaidIds.includes(b.id))
    .reduce((s, b) => s + b.totalAmount, 0);

  const handleAddDeduction = () => {
    if (!newReason || newAmount <= 0) {
      Toast.show('请填写扣减原因和金额');
      return;
    }
    setDeductions([...deductions, { reason: newReason, amount: newAmount }]);
    setNewReason('');
    setNewAmount(0);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleConfirmRefund = () => {
    if (!selectedDeposit) return;
    const result = processDepositWithUnpaid(
      selectedDeposit.id,
      deductions,
      selectedUnpaidIds,
      '运营-管理员',
      processRemark || undefined
    );
    const statusInfo = statusLabel[result.status];
    Toast.show(`处理完成：${statusInfo.label}，应退 ${formatMoney(result.refundAmount)}`);
    setShowRefund(false);
    setDeductions([]);
    setSelectedUnpaidIds([]);
    setProcessRemark('');
    setSelectedDepositId('');
  };

  const handleInitDeposit = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant || !currentBillingRule) return;

    const depositAmount = currentBillingRule.rentAmount * currentBillingRule.depositMonths;
    const record = calculateDepositRefund(
      selectedApartmentId,
      tenant.id,
      tenant.name,
      tenant.roomNumber,
      depositAmount,
      []
    );

    const depositWithHeldStatus: DepositRecord = {
      ...record,
      status: 'HELD',
    };

    addDeposit(depositWithHeldStatus);
    Toast.show(`已为 ${tenant.name} 创建押金记录 ${formatMoney(depositAmount)}`);
  };

  const openRefundDialog = (depositId: string) => {
    const deposit = deposits.find((d) => d.id === depositId);
    if (!deposit) return;
    setSelectedDepositId(depositId);
    setDeductions([...deposit.deductions]);
    setSelectedUnpaidIds(deposit.unpaidBillIds ?? []);
    setProcessRemark(deposit.processRemark ?? '');
    setShowRefund(true);
  };

  return (
    <div className="page-deposit">
      <div className="section-title">押金记录</div>
      {apartmentDeposits.length === 0 && (
        <div className="empty-state">暂无押金记录</div>
      )}
      {apartmentDeposits.map((deposit) => {
        const statusInfo = statusLabel[deposit.status];
        const unpaidForTenant = bills.filter(
          (b) => b.tenantId === deposit.tenantId && (b.status === 'PENDING' || b.status === 'OVERDUE')
        );
        return (
          <Card key={deposit.id} className="deposit-card">
            <div className="deposit-header">
              <div>
                <div className="deposit-tenant">{deposit.tenantName}</div>
                <div className="deposit-room">{deposit.roomNumber}</div>
              </div>
              <Tag color={statusInfo.color} fill="outline">
                {statusInfo.label}
              </Tag>
            </div>
            <div className="deposit-body">
              <div className="deposit-row">
                <span>押金金额</span>
                <span>{formatMoney(deposit.depositAmount)}</span>
              </div>
              {deposit.deductions.length > 0 && (
                <div className="deduction-list">
                  <div className="deduction-title">扣减项</div>
                  {deposit.deductions.map((d, i) => (
                    <div key={i} className="deposit-row deduction">
                      <span>{d.reason}</span>
                      <span className="deduction-amount">-{formatMoney(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(deposit.unpaidBillIds?.length ?? 0) > 0 && (
                <div className="deduction-list">
                  <div className="deduction-title">抵扣未缴账单 ({deposit.unpaidBillIds!.length}笔)</div>
                  <div className="deposit-row deduction">
                    <span>未缴合计</span>
                    <span className="deduction-amount">-{formatMoney(deposit.unpaidAmount ?? 0)}</span>
                  </div>
                </div>
              )}
              <div className="deposit-row total">
                <span>应退金额</span>
                <span className="refund-amount">{formatMoney(deposit.refundAmount)}</span>
              </div>
              {deposit.status !== 'HELD' && (
                <div className="deposit-process-info">
                  <div className="process-row">
                    <span>处理人</span>
                    <span>{deposit.processedBy ?? '-'}</span>
                  </div>
                  <div className="process-row">
                    <span>处理时间</span>
                    <span>{deposit.processedAt ?? '-'}</span>
                  </div>
                  {deposit.processRemark && (
                    <div className="process-row">
                      <span>处理备注</span>
                      <span>{deposit.processRemark}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {deposit.status === 'HELD' && (
              <div className="deposit-actions">
                <Button
                  size="small"
                  color="primary"
                  onClick={() => openRefundDialog(deposit.id)}
                >
                  退租结算
                </Button>
                {unpaidForTenant.length > 0 && (
                  <div className="unpaid-hint">有 {unpaidForTenant.length} 笔未缴账单</div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {tenantsWithoutDeposit.length > 0 && (
        <>
          <div className="section-title">初始化押金</div>
          {tenantsWithoutDeposit.map((tenant) => {
            const depositAmount = currentBillingRule
              ? currentBillingRule.rentAmount * currentBillingRule.depositMonths
              : 0;
            return (
              <Card key={tenant.id} className="tenant-init-card">
                <div className="deposit-row">
                  <span>{tenant.name} ({tenant.roomNumber})</span>
                  <span>{formatMoney(depositAmount)}</span>
                </div>
                <Button
                  size="mini"
                  color="primary"
                  fill="outline"
                  onClick={() => handleInitDeposit(tenant.id)}
                >
                  创建押金
                </Button>
              </Card>
            );
          })}
        </>
      )}

      <Dialog
        visible={showRefund}
        title="退租结算 - 押金处理"
        content={
          <div className="dialog-form">
            {unpaidBills.length > 0 && (
              <div className="form-section">
                <div className="form-section-title">未缴账单抵扣 ({selectedUnpaidAmount > 0 ? formatMoney(selectedUnpaidAmount) : '未选择'})</div>
                <CheckList
                  value={selectedUnpaidIds}
                  onChange={(v) => setSelectedUnpaidIds(v as string[])}
                >
                  {unpaidBills.map((b) => (
                    <CheckList.Item key={b.id} value={b.id}>
                      {b.periodStart.slice(0, 7)} · {formatMoney(b.totalAmount)}
                      {b.status === 'OVERDUE' && ' · 逾期'}
                    </CheckList.Item>
                  ))}
                </CheckList>
              </div>
            )}

            <div className="form-section">
              <div className="form-section-title">扣减项 ({totalDeductions > 0 ? formatMoney(totalDeductions) : '无'})</div>
              {deductions.length > 0 && (
                <div className="existing-deductions">
                  {deductions.map((d, i) => (
                    <div key={i} className="deduction-item-row">
                      <span>{d.reason}: -{formatMoney(d.amount)}</span>
                      <Button size="mini" fill="outline" color="danger" onClick={() => handleRemoveDeduction(i)}>
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-item">
                <span>扣减原因</span>
                <Input
                  placeholder="如：墙面修复"
                  value={newReason}
                  onChange={setNewReason}
                />
              </div>
              <div className="form-item">
                <span>扣减金额</span>
                <Stepper value={newAmount} onChange={(v) => setNewAmount(v)} min={0} step={50} />
              </div>
              <Button size="small" fill="outline" onClick={handleAddDeduction} style={{ marginTop: 8 }}>
                + 添加扣减项
              </Button>
            </div>

            <div className="form-section">
              <div className="form-section-title">处理备注</div>
              <Input
                placeholder="选填：退租情况说明"
                value={processRemark}
                onChange={setProcessRemark}
              />
            </div>

            {selectedDeposit && (
              <div className="deposit-preview">
                <div className="deposit-row">
                  <span>押金金额</span>
                  <span>{formatMoney(selectedDeposit.depositAmount)}</span>
                </div>
                <div className="deposit-row deduction">
                  <span>扣减合计</span>
                  <span>-{formatMoney(totalDeductions)}</span>
                </div>
                {selectedUnpaidAmount > 0 && (
                  <div className="deposit-row deduction">
                    <span>抵扣未缴</span>
                    <span>-{formatMoney(selectedUnpaidAmount)}</span>
                  </div>
                )}
                <div className="deposit-row total">
                  <span>预计应退</span>
                  <span className="refund-amount">
                    {formatMoney(Math.max(0, selectedDeposit.depositAmount - totalDeductions - selectedUnpaidAmount))}
                  </span>
                </div>
              </div>
            )}
          </div>
        }
        closeOnAction
        onClose={() => {
          setShowRefund(false);
          setDeductions([]);
          setSelectedUnpaidIds([]);
          setProcessRemark('');
        }}
        actions={[
          { key: "cancel", text: "取消" },
          {
            key: "confirm",
            text: "确认退还",
            bold: true,
            onClick: handleConfirmRefund,
          },
        ]}
      />
    </div>
  );
};

export default Deposit;
