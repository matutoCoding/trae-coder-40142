import React, { useState } from 'react';
import { Card, Tag, Tabs, Button, Dialog, Toast, Picker, Stepper } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import dayjs from 'dayjs';
import type { BillStatus } from '../core/types';

const statusColor: Record<BillStatus, string> = {
  PENDING: '#ff8f1f',
  PAID: '#00b578',
  OVERDUE: '#ff3141',
  CANCELLED: '#ccc',
};

const statusLabel: Record<BillStatus, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  OVERDUE: '逾期',
  CANCELLED: '已取消',
};

const BillList: React.FC = () => {
  const {
    bills,
    selectedApartmentId,
    updateBillStatus,
    billingRules,
    updateBillingRule,
    generateBillsForMonth,
  } = useRentStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showBillingConfig, setShowBillingConfig] = useState(false);
  const [generateMonth, setGenerateMonth] = useState<string>('2026-07');

  const currentBillingRule = billingRules.find((br) => br.apartmentId === selectedApartmentId);
  const [editRent, setEditRent] = useState(currentBillingRule?.rentAmount ?? 4500);
  const [editGraceDays, setEditGraceDays] = useState(currentBillingRule?.graceDays ?? 5);
  const [editLateFeeRate, setEditLateFeeRate] = useState(currentBillingRule?.lateFeeRate ?? 0.0005);

  const apartmentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);

  const filteredBills = activeTab === 'all'
    ? apartmentBills
    : apartmentBills.filter((b) => b.status === activeTab);

  const handlePay = (billId: string) => {
    Dialog.confirm({
      content: '确认标记为已支付？',
      onConfirm: () => {
        updateBillStatus(billId, 'PAID');
        Toast.show('已标记为已支付');
      },
    });
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
        <Tabs.Tab title={`已支付 (${apartmentBills.filter(b => b.status === 'PAID').length})`} key="PAID" />
        <Tabs.Tab title={`逾期 (${apartmentBills.filter(b => b.status === 'OVERDUE').length})`} key="OVERDUE" />
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
            </div>
            {bill.status === 'PENDING' && (
              <div className="bill-card-footer">
                <Button
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePay(bill.id);
                  }}
                >
                  标记已付
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

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
