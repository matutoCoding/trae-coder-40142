import React from 'react';
import { Card, Tag } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';

const Commission: React.FC = () => {
  const { bills, commissionRules, selectedApartmentId, getCommissionSplits, getLandlordIncomeSummary } = useRentStore();

  const splits = getCommissionSplits(selectedApartmentId);
  const landlordSummary = getLandlordIncomeSummary(selectedApartmentId);
  const totalAmount = splits.reduce((sum, s) => sum + s.totalAmount, 0);
  const apartmentIncome = splits.reduce((sum, s) => sum + s.apartmentIncome, 0);

  return (
    <div className="page-commission">
      <div className="section-title">抽成总览</div>
      <Card className="overview-card">
        <div className="overview-row">
          <span>本期总金额</span>
          <span className="overview-amount">{formatMoney(totalAmount)}</span>
        </div>
        <div className="overview-row">
          <span>公寓方总收入</span>
          <span className="overview-apt">{formatMoney(apartmentIncome)}</span>
        </div>
      </Card>

      <div className="section-title">房东收入归集</div>
      {landlordSummary.map((item) => (
        <Card key={item.landlordId} className="landlord-card">
          <div className="landlord-header">
            <span className="landlord-name">{item.landlordName}</span>
            <Tag color="#00b578" fill="outline">{formatMoney(item.income)}</Tag>
          </div>
        </Card>
      ))}

      <div className="section-title">抽成规则（按房东区分）</div>
      {commissionRules
        .filter((cr) => cr.apartmentId === selectedApartmentId)
        .map((rule) => {
          const landlordBills = bills.filter(b => b.apartmentId === selectedApartmentId && b.landlordId === rule.landlordId);
          return (
            <Card key={rule.id} className="commission-rule-card">
              <div className="commission-rule-row">
                <span>房东</span>
                <span>{rule.landlordName}</span>
              </div>
              <div className="commission-rule-row">
                <span>关联账单数</span>
                <span>{landlordBills.length} 笔</span>
              </div>
              <div className="commission-rule-row">
                <span>公寓方抽成</span>
                <span className="apt-share">{(rule.apartmentShare * 100).toFixed(0)}%</span>
              </div>
              <div className="commission-rule-row">
                <span>房东抽成</span>
                <span className="ll-share">{(rule.landlordShare * 100).toFixed(0)}%</span>
              </div>
              <div className="commission-rule-row">
                <span>生效日期</span>
                <span>{rule.effectiveFrom}</span>
              </div>
            </Card>
          );
        })}

      <div className="section-title">逐笔分账明细</div>
      {splits.map((s, i) => (
        <Card key={i} className="split-detail-card">
          <div className="split-row">
            <span>账单编号</span>
            <span>{s.billId}</span>
          </div>
          <div className="split-row">
            <span>房东</span>
            <span>{s.landlordName}</span>
          </div>
          <div className="split-row">
            <span>总金额</span>
            <span>{formatMoney(s.totalAmount)}</span>
          </div>
          <div className="split-row apt">
            <span>公寓方 ({(s.apartmentShare * 100).toFixed(0)}%)</span>
            <span>{formatMoney(s.apartmentIncome)}</span>
          </div>
          <div className="split-row ll">
            <span>{s.landlordName} ({(s.landlordShare * 100).toFixed(0)}%)</span>
            <span>{formatMoney(s.landlordIncome)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Commission;
