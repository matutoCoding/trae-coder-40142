import React, { useState } from 'react';
import { Card, Tag, Button, NavBar, Dialog, Toast, Picker, Input } from 'antd-mobile';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { PaymentMethodLabel } from '../core/types';
import type { BillStatus, PaymentMethod, PaymentInfo } from '../core/types';

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

const BillDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills, payBill } = useRentStore();
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('WECHAT');
  const [payRemark, setPayRemark] = useState('');
  const [payTransactionNo, setPayTransactionNo] = useState('');

  const bill = bills.find((b) => b.id === id);
  if (!bill) {
    return (
      <div>
        <NavBar onBack={() => navigate(-1)}>账单详情</NavBar>
        <div className="empty-state">未找到账单</div>
      </div>
    );
  }

  const handleConfirmPay = () => {
    const paymentInfo: PaymentInfo = {
      method: payMethod,
      remark: payRemark || undefined,
      transactionNo: payTransactionNo || undefined,
    };
    payBill(bill.id, paymentInfo);
    Toast.show('已标记为已收款');
    setShowPay(false);
  };

  const paymentMethodOptions: { label: string; value: PaymentMethod }[] = [
    { label: '微信', value: 'WECHAT' },
    { label: '支付宝', value: 'ALIPAY' },
    { label: '银行转账', value: 'BANK_TRANSFER' },
    { label: '现金', value: 'CASH' },
    { label: '刷卡', value: 'CARD' },
  ];

  return (
    <div className="page-bill-detail">
      <NavBar onBack={() => navigate(-1)}>账单详情</NavBar>

      <div className="bill-detail-header">
        <div>
          <div className="bill-detail-tenant">{bill.tenantName}</div>
          <div className="bill-detail-room">{bill.roomNumber} · {bill.periodStart} ~ {bill.periodEnd}</div>
        </div>
        <Tag color={statusColor[bill.status]} round fill="outline">
          {statusLabel[bill.status]}
        </Tag>
      </div>

      <Card className="bill-detail-card">
        <div className="bill-detail-title">金额明细</div>
        <div className="bill-detail-row">
          <span>原始租金</span>
          <span>{formatMoney(bill.rentAmount)}</span>
        </div>
        <div className="bill-detail-row discount">
          <span>优惠减免 ({bill.discountResult.steps.length}项)</span>
          <span>-{formatMoney(bill.discountResult.totalDiscount)}</span>
        </div>
        {bill.discountResult.steps.map((step, i) => (
          <div key={i} className="bill-detail-sub">
            <span>└ {step.ruleName}</span>
            <span>-{formatMoney(step.discountAmount)}</span>
          </div>
        ))}
        {bill.lateFee > 0 && (
          <div className="bill-detail-row late">
            <span>滞纳金</span>
            <span>+{formatMoney(bill.lateFee)}</span>
          </div>
        )}
        <div className="bill-detail-divider" />
        <div className="bill-detail-row total">
          <span>应付金额</span>
          <span className="total-amount">{formatMoney(bill.totalAmount)}</span>
        </div>
      </Card>

      {bill.paymentInfo && (
        <Card className="bill-detail-card">
          <div className="bill-detail-title">收款信息</div>
          <div className="bill-detail-row">
            <span>收款方式</span>
            <span>{PaymentMethodLabel[bill.paymentInfo.method]}</span>
          </div>
          {bill.paidAt && (
            <div className="bill-detail-row">
              <span>收款时间</span>
              <span>{bill.paidAt}</span>
            </div>
          )}
          {bill.paymentInfo.transactionNo && (
            <div className="bill-detail-row">
              <span>流水号</span>
              <span>{bill.paymentInfo.transactionNo}</span>
            </div>
          )}
          {bill.paymentInfo.remark && (
            <div className="bill-detail-row">
              <span>备注</span>
              <span>{bill.paymentInfo.remark}</span>
            </div>
          )}
        </Card>
      )}

      <Card className="bill-detail-card">
        <div className="bill-detail-title">账单信息</div>
        <div className="bill-detail-row">
          <span>账单ID</span>
          <span>{bill.id}</span>
        </div>
        <div className="bill-detail-row">
          <span>生成时间</span>
          <span>{bill.createdAt}</span>
        </div>
        <div className="bill-detail-row">
          <span>到期时间</span>
          <span>{bill.dueDate}</span>
        </div>
      </Card>

      {(bill.status === 'PENDING' || bill.status === 'OVERDUE') && (
        <div className="bill-detail-footer">
          <Button color="primary" size="large" block onClick={() => setShowPay(true)}>
            登记收款
          </Button>
        </div>
      )}

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
          { key: "confirm", text: "确认收款", bold: true, onClick: handleConfirmPay },
        ]}
      />
    </div>
  );
};

export default BillDetail;
