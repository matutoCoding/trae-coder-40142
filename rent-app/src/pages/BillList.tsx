import React, { useState } from 'react';
import { Card, Tag, Tabs, Button, Dialog } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
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
  const { bills, selectedApartmentId, updateBillStatus } = useRentStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');

  const apartmentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);

  const filteredBills = activeTab === 'all'
    ? apartmentBills
    : apartmentBills.filter((b) => b.status === activeTab);

  const handlePay = (billId: string) => {
    Dialog.confirm({
      content: '确认标记为已支付？',
      onConfirm: () => {
        updateBillStatus(billId, 'PAID');
      },
    });
  };

  return (
    <div className="page-bills">
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
    </div>
  );
};

export default BillList;
