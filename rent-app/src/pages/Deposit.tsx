import React, { useState } from 'react';
import { Card, Tag, Button, Dialog, Input, Toast, Stepper } from 'antd-mobile';
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
    selectedApartmentId,
    addDeposit,
    processDepositDeductions,
    billingRules,
  } = useRentStore();

  const [showDeduction, setShowDeduction] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string>('');
  const [deductions, setDeductions] = useState<DepositDeduction[]>([]);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState(0);

  const apartmentDeposits = deposits.filter(
    (d) => d.apartmentId === selectedApartmentId
  );

  const currentBillingRule = billingRules.find((br) => br.apartmentId === selectedApartmentId);

  const tenantsWithoutDeposit = tenants.filter(
    (t) => t.apartmentId === selectedApartmentId && !apartmentDeposits.some((d) => d.tenantId === t.id)
  );

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

  const handleConfirmDeduction = () => {
    const result = processDepositDeductions(selectedDepositId, deductions);
    const statusInfo = statusLabel[result.status];
    Toast.show(`处理完成：${statusInfo.label}，应退 ${formatMoney(result.refundAmount)}`);
    setShowDeduction(false);
    setDeductions([]);
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

  const openDeductionDialog = (depositId: string) => {
    const deposit = deposits.find((d) => d.id === depositId);
    if (!deposit) return;
    setSelectedDepositId(depositId);
    setDeductions([...deposit.deductions]);
    setShowDeduction(true);
  };

  return (
    <div className="page-deposit">
      <div className="section-title">押金记录</div>
      {apartmentDeposits.length === 0 && (
        <div className="empty-state">暂无押金记录</div>
      )}
      {apartmentDeposits.map((deposit) => {
        const statusInfo = statusLabel[deposit.status];
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
              <div className="deposit-row total">
                <span>应退金额</span>
                <span className="refund-amount">{formatMoney(deposit.refundAmount)}</span>
              </div>
            </div>
            {deposit.status === 'HELD' && (
              <div className="deposit-actions">
                <Button
                  size="small"
                  color="primary"
                  fill="outline"
                  onClick={() => openDeductionDialog(deposit.id)}
                >
                  录入扣减
                </Button>
                <Button
                  size="small"
                  color="success"
                  onClick={() => {
                    processDepositDeductions(deposit.id, []);
                    Toast.show('已全额退还');
                  }}
                >
                  全额退还
                </Button>
              </div>
            )}
            {(deposit.status === 'PARTIAL_REFUND') && (
              <div className="deposit-actions">
                <Button
                  size="small"
                  color="primary"
                  fill="outline"
                  onClick={() => openDeductionDialog(deposit.id)}
                >
                  修改扣减
                </Button>
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
        visible={showDeduction}
        title="录入扣减项"
        content={
          <div className="dialog-form">
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
        }
        closeOnAction
        onClose={() => { setShowDeduction(false); setDeductions([]); }}
        actions={[
          { key: "cancel", text: "取消" },
          {
            key: "confirm",
            text: "确认处理",
            bold: true,
            onClick: handleConfirmDeduction,
          },
        ]}
      />
    </div>
  );
};

export default Deposit;
