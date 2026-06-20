import React, { useState, useMemo } from 'react';
import { Card, Tag, Tabs, Button, Dialog, Toast, Picker, Stepper, Input } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { PaymentMethodLabel } from '../core/types';
import type { BillStatus, PaymentMethod, PaymentInfo } from '../core/types';
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

const BillList: React.FC = () => {
  const {
    bills,
    selectedApartmentId,
    billingRules,
    updateBillingRule,
    generateBillsForMonth,
    payBill,
  } = useRentStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showBillingConfig, setShowBillingConfig] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payingBillId, setPayingBillId] = useState<string>('');
  const [generateMonth, setGenerateMonth] = useState<string>('2026-07');

  const currentBillingRule = billingRules.find((br) => br.apartmentId === selectedApartmentId);
  const [editRent, setEditRent] = useState(currentBillingRule?.rentAmount ?? 4500);
  const [editGraceDays, setEditGraceDays] = useState(currentBillingRule?.graceDays ?? 5);
  const [editLateFeeRate, setEditLateFeeRate] = useState(currentBillingRule?.lateFeeRate ?? 0.0005);

  const [payMethod, setPayMethod] = useState<PaymentMethod>('WECHAT');
  const [payRemark, setPayRemark] = useState('');
  const [payTransactionNo, setPayTransactionNo] = useState('');

  const apartmentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);

  const filteredBills = useMemo(() => {
    if (activeTab === 'flow') {
      return apartmentBills.filter((b) => b.status === 'PAID' || b.status === 'SETTLED_BY_DEPOSIT').sort(
        (a, b) => dayjs(b.paidAt ?? '').valueOf() - dayjs(a.paidAt ?? '').valueOf()
      );
    }
    if (activeTab === 'all') return apartmentBills;
    return apartmentBills.filter((b) => b.status === activeTab);
  }, [apartmentBills, activeTab]);

  const handlePay = (billId: string) => {
    setPayingBillId(billId);
    setPayMethod('WECHAT');
    setPayRemark('');
    setPayTransactionNo('');
    setShowPay(true);
  };

  const confirmPay = () => {
    const paymentInfo: PaymentInfo = {
      method: payMethod,
      remark: payRemark || undefined,
      transactionNo: payTransactionNo || undefined,
    };
    payBill(payingBillId, paymentInfo);
    Toast.show('已标记为已收款');
    setShowPay(false);
  };

  const handleGenerateBills = () => {
    const newBills = generateBillsForMonth(selectedApartmentId, generateMonth);
    if (newBills.length === 0) {
      Toast.show('该月份所有租户已有账单，无需重复生成');
    } else {
      Toast.show(`已生成 ${newBills.length} 笔账单`);
    }
    setShowGenerate(false);
  };

  const handleSaveBillingRule = () => {
    if (!currentBillingRule) return;
    updateBillingRule({
      ...currentBillingRule,
      rentAmount: editRent,
      graceDays: editGraceDays,
      lateFeeRate: editLateFeeRate,
    });
    Toast.show('租金规则已更新');
    setShowBillingConfig(false);
  };

  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = dayjs().add(i, 'month');
    months.push({ label: d.format('YYYY年MM月'), value: d.format('YYYY-MM') });
  }

  const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
    { label: '微信', value: 'WECHAT' },
    { label: '支付宝', value: 'ALIPAY' },
    { label: '银行转账', value: 'BANK_TRANSFER' },
    { label: '现金', value: 'CASH' },
    { label: '刷卡', value: 'CARD' },
  ];

  return (
    <div className="page-bills">
      <div className="bill-actions">
        <Button size="small" fill="outline" onClick={() => setShowBillingConfig(true)}>
          租金规则
        </Button>
        <Button size="small" color="primary" onClick={() => setShowGenerate(true)}>
          生成账单
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ '--active-line-color': '#1677ff', '--active-title-color': '#1677ff' }}
      >
        <Tabs.Tab title={`全部 (${apartmentBills.length})`} key="all" />
        <Tabs.Tab title={`待支付 (${apartmentBills.filter(b => b.status === 'PENDING').length})`} key="PENDING" />
        <Tabs.Tab title={`已支付 (${apartmentBills.filter(b => b.status === 'PAID').length})`} key="flow" />
        <Tabs.Tab title={`逾期 (${apartmentBills.filter(b => b.status === 'OVERDUE').length})`} key="OVERDUE" />
        <Tabs.Tab title={`押金抵扣 (${apartmentBills.filter(b => b.status === 'SETTLED_BY_DEPOSIT').length})`} key="SETTLED_BY_DEPOSIT" />
      </Tabs>

      <div className="bill-list">
        {filteredBills.length === 0 && (
          <div className="empty-state">暂无账单</div>
        )}
        {filteredBills.map((bill) => (
          <Card
            key={bill.id}
            className="bill-card"
            onClick={() => navigate(`/bills/${bill.id}`)}
          >
            <div className="bill-card-header">
              <div>
                <div className="bill-tenant">{bill.tenantName}</div>
                <div className="bill-room">{bill.roomNumber}</div>
              </div>
              <Tag color={statusColor[bill.status]} fill="outline">
                {statusLabel[bill.status]}
              </Tag>
            </div>
            <div className="bill-card-body">
              <div className="bill-row">
                <span>账单周期</span>
                <span>{bill.periodStart} ~ {bill.periodEnd}</span>
              </div>
              <div className="bill-row">
                <span>原始租金</span>
                <span>{formatMoney(bill.rentAmount)}</span>
              </div>
              <div className="bill-row discount">
                <span>优惠减免</span>
                <span>-{formatMoney(bill.discountResult.totalDiscount)}</span>
              </div>
              {bill.lateFee > 0 && (
                <div className="bill-row late">
                  <span>滞纳金</span>
                  <span>+{formatMoney(bill.lateFee)}</span>
                </div>
              )}
              <div className="bill-row total">
                <span>应付金额</span>
                <span className="total-amount">{formatMoney(bill.totalAmount)}</span>
              </div>
              {bill.status === 'SETTLED_BY_DEPOSIT' ? (
                <div className="bill-pay-info">
                  <div className="pay-info-row">
                    <span>来源</span>
                    <span>押金抵扣</span>
                  </div>
                  {bill.settledByDepositId && (
                    <div className="pay-info-row">
                      <span>押金记录</span>
                      <span>{bill.settledByDepositId}</span>
                    </div>
                  )}
                  {bill.paidAt && (
                    <div className="pay-info-row">
                      <span>抵扣时间</span>
                      <span>{bill.paidAt}</span>
                    </div>
                  )}
                </div>
              ) : bill.paymentInfo && (
                <div className="bill-pay-info">
                  <div className="pay-info-row">
                    <span>收款方式</span>
                    <span>{PaymentMethodLabel[bill.paymentInfo.method]}</span>
                  </div>
                  {bill.paidAt && (
                    <div className="pay-info-row">
                      <span>收款时间</span>
                      <span>{bill.paidAt}</span>
                    </div>
                  )}
                  {bill.paymentInfo.transactionNo && (
                    <div className="pay-info-row">
                      <span>流水号</span>
                      <span>{bill.paymentInfo.transactionNo}</span>
                    </div>
                  )}
                  {bill.paymentInfo.remark && (
                    <div className="pay-info-row">
                      <span>备注</span>
                      <span>{bill.paymentInfo.remark}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {(bill.status === 'PENDING' || bill.status === 'OVERDUE') && (
              <div className="bill-card-footer">
                <Button
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePay(bill.id);
                  }}
                >
                  登记收款
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog
        visible={showPay}
        title="登记收款"
        content={
          <div className="dialog-form">
            <div className="form-item">
              <span>收款方式</span>
              <Picker
                columns={[paymentMethodOptions]}
                onConfirm={(v) => setPayMethod(v[0] as PaymentMethod)}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {PaymentMethodLabel[payMethod]}
                  </Button>
                )}
              </Picker>
            </div>
            <div className="form-item">
              <span>流水号</span>
              <Input
                placeholder="选填：交易流水号"
                value={payTransactionNo}
                onChange={setPayTransactionNo}
              />
            </div>
            <div className="form-item">
              <span>备注</span>
              <Input
                placeholder="选填：备注信息"
                value={payRemark}
                onChange={setPayRemark}
              />
            </div>
          </div>
        }
        closeOnAction
        onClose={() => setShowPay(false)}
        actions={[
          { key: "cancel", text: "取消" },
          { key: "confirm", text: "确认收款", bold: true, onClick: confirmPay },
        ]}
      />

      <Dialog
        visible={showGenerate}
        title="按月生成账单"
        content={
          <div className="dialog-form">
            <div className="form-item">
              <span>选择月份</span>
              <Picker
                columns={[months]}
                onConfirm={(v) => setGenerateMonth(v[0] as string)}
              >
                {(_, actions) => (
                  <Button size="small" fill="outline" onClick={actions.open}>
                    {generateMonth}
                  </Button>
                )}
              </Picker>
            </div>
            <div className="form-hint">
              将为当前公寓的有效租户自动生成{generateMonth}月账单，已有账单的租户不会重复生成。
            </div>
          </div>
        }
        closeOnAction
        onClose={() => setShowGenerate(false)}
        actions={[
          { key: "cancel", text: "取消" },
          { key: "confirm", text: "生成", bold: true, onClick: handleGenerateBills },
        ]}
      />

      <Dialog
        visible={showBillingConfig}
        title="租金规则配置"
        content={
          <div className="dialog-form">
            <div className="form-item">
              <span>月租金</span>
              <Stepper value={editRent} onChange={(v) => setEditRent(v)} min={0} step={100} />
            </div>
            <div className="form-item">
              <span>宽限期(天)</span>
              <Stepper value={editGraceDays} onChange={(v) => setEditGraceDays(v)} min={0} step={1} />
            </div>
            <div className="form-item">
              <span>滞纳金日利率</span>
              <Stepper value={editLateFeeRate * 10000} onChange={(v) => setEditLateFeeRate(v / 10000)} min={0} step={1} digits={0} />
              <span className="form-hint">× 万分之一</span>
            </div>
          </div>
        }
        closeOnAction
        onClose={() => setShowBillingConfig(false)}
        actions={[
          { key: "cancel", text: "取消" },
          { key: "confirm", text: "保存", bold: true, onClick: handleSaveBillingRule },
        ]}
      />
    </div>
  );
};

export default BillList;
