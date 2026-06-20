import React from 'react';
import { Card, Tag, Button } from 'antd-mobile';
import { useParams, useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import type { BillStatus, DiscountType } from '../core/types';

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

const typeLabel: Record<DiscountType, string> = {
  COUPON: '优惠券',
  FULL_REDUCTION: '满减',
  PERCENTAGE: '折扣',
  FIXED: '固定优惠',
};

const BillDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bills, updateBillStatus, commissionRules, commissionSplits } = useRentStore();

  const bill = bills.find((b) => b.id === id);
  if (!bill) {
    return <div className="empty-state">账单不存在</div>;
  }

  const commissionRule = commissionRules.find((cr) => cr.apartmentId === bill.apartmentId);
  const split = commissionSplits.find((s) => s.billId === bill.id);

  const handlePay = () => {
    updateBillStatus(bill.id, 'PAID');
  };

  return (
    <div className="page-bill-detail">
      <div className="detail-header">
        <Button size="small" fill="outline" onClick={() => navigate(-1)}>
          ← 返回
        </Button>
        <Tag color={statusColor[bill.status]} fill="outline" style={{ fontSize: 14, padding: '4px 12px' }}>
          {statusLabel[bill.status]}
        </Tag>
      </div>

      <Card className="detail-card">
        <div className="detail-section-title">基本信息</div>
        <div className="detail-row">
          <span>租户</span>
          <span>{bill.tenantName}</span>
        </div>
        <div className="detail-row">
          <span>房间号</span>
          <span>{bill.roomNumber}</span>
        </div>
        <div className="detail-row">
          <span>账单周期</span>
          <span>{bill.periodStart} ~ {bill.periodEnd}</span>
        </div>
        <div className="detail-row">
          <span>创建时间</span>
          <span>{bill.createdAt}</span>
        </div>
        {bill.paidAt && (
          <div className="detail-row">
            <span>支付时间</span>
            <span>{bill.paidAt}</span>
          </div>
        )}
      </Card>

      <Card className="detail-card">
        <div className="detail-section-title">费用明细</div>
        <div className="detail-row">
          <span>原始租金</span>
          <span>{formatMoney(bill.rentAmount)}</span>
        </div>

        {bill.discountResult.steps.length > 0 && (
          <div className="discount-steps">
            <div className="detail-section-subtitle">优惠计算过程</div>
            {bill.discountResult.steps.map((step, i) => (
              <div key={i} className="discount-step-detail">
                <div className="step-header">
                  <span className="step-index">第{i + 1}步</span>
                  <Tag color="#1677ff" fill="outline" style={{ fontSize: 11 }}>
                    {typeLabel[step.type]}
                  </Tag>
                </div>
                <div className="step-body">
                  <div className="step-row">
                    <span>规则: {step.ruleName}</span>
                    <span className="step-discount">-{formatMoney(step.discountAmount)}</span>
                  </div>
                  <div className="step-row">
                    <span>计算前: {formatMoney(step.amountBefore)}</span>
                    <span>计算后: {formatMoney(step.amountAfter)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="detail-row discount-total">
          <span>优惠合计</span>
          <span className="discount-amount">-{formatMoney(bill.discountResult.totalDiscount)}</span>
        </div>
        {bill.discountResult.negFloorApplied && (
          <div className="neg-warning">⚠️ 优惠叠加后为负值，已自动兜底为0</div>
        )}
        {bill.lateFee > 0 && (
          <div className="detail-row late-fee">
            <span>滞纳金</span>
            <span className="late-amount">+{formatMoney(bill.lateFee)}</span>
          </div>
        )}
        <div className="detail-row total-row">
          <span>应付金额</span>
          <span className="total-amount">{formatMoney(bill.totalAmount)}</span>
        </div>
      </Card>

      {commissionRule && (
        <Card className="detail-card">
          <div className="detail-section-title">抽成分账</div>
          <div className="detail-row">
            <span>公寓方抽成比例</span>
            <span>{(commissionRule.apartmentShare * 100).toFixed(0)}%</span>
          </div>
          <div className="detail-row">
            <span>房东抽成比例</span>
            <span>{(commissionRule.landlordShare * 100).toFixed(0)}%</span>
          </div>
          {split && (
            <>
              <div className="detail-row">
                <span>公寓方收入</span>
                <span>{formatMoney(split.apartmentIncome)}</span>
              </div>
              <div className="detail-row">
                <span>房东 ({split.landlordName}) 收入</span>
                <span>{formatMoney(split.landlordIncome)}</span>
              </div>
            </>
          )}
        </Card>
      )}

      {bill.status === 'PENDING' && (
        <Button block color="primary" size="large" onClick={handlePay} style={{ marginTop: 16 }}>
          确认收款
        </Button>
      )}
    </div>
  );
};

export default BillDetail;
