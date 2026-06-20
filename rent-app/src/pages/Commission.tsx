import React, { useMemo } from 'react';
import { Card, Tag } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { splitCommission, aggregateIncomeByParty } from '../core/commissionSplitter';
import { formatMoney } from '../core/reconciliator';

const Commission: React.FC = () => {
  const { bills, commissionRules, selectedApartmentId } = useRentStore();

  const splits = useMemo(() => {
    const apartmentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);
    return apartmentBills.map((bill) => {
      const rule = commissionRules.find((cr) => cr.apartmentId === bill.apartmentId);
      if (!rule) return null;
      return splitCommission(bill, rule);
    }).filter(Boolean);
  }, [bills, commissionRules, selectedApartmentId]);

  const aggregation = useMemo(() => {
    return aggregateIncomeByParty(splits as NonNullable<typeof splits>[number][]);
  }, [splits]);

  const paidSplits = splits.filter((s) => s);
  const totalAmount = paidSplits.reduce((sum, s) => sum + s!.totalAmount, 0);

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
          <span className="overview-apt">{formatMoney(aggregation.apartmentIncome)}</span>
        </div>
      </Card>

      <div className="section-title">房东收入归集</div>
      {Array.from(aggregation.landlordIncomes.entries()).map(([landlordId, data]) => (
        <Card key={landlordId} className="landlord-card">
          <div className="landlord-header">
            <span className="landlord-name">{data.name}</span>
            <Tag color="#00b578" fill="outline">{formatMoney(data.income)}</Tag>
          </div>
        </Card>
      ))}

      <div className="section-title">抽成规则</div>
      {commissionRules
        .filter((cr) => cr.apartmentId === selectedApartmentId)
        .map((rule) => (
          <Card key={rule.id} className="commission-rule-card">
            <div className="commission-rule-row">
              <span>房东</span>
              <span>{rule.landlordName}</span>
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
        ))}

      <div className="section-title">逐笔分账明细</div>
      {paidSplits.map((s, i) => (
        <Card key={i} className="split-detail-card">
          <div className="split-row">
            <span>账单编号</span>
            <span>{s!.billId}</span>
          </div>
          <div className="split-row">
            <span>总金额</span>
            <span>{formatMoney(s!.totalAmount)}</span>
          </div>
          <div className="split-row apt">
            <span>公寓方 ({(s!.apartmentShare * 100).toFixed(0)}%)</span>
            <span>{formatMoney(s!.apartmentIncome)}</span>
          </div>
          <div className="split-row ll">
            <span>{s!.landlordName} ({(s!.landlordShare * 100).toFixed(0)}%)</span>
            <span>{formatMoney(s!.landlordIncome)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Commission;
