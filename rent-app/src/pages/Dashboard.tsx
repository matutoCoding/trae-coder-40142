import React, { useMemo } from 'react';
import { Card, ProgressBar, Tag } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';
import { PaymentMethodLabel } from '../core/types';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  PENDING: '#ff8f1f',
  PAID: '#00b578',
  OVERDUE: '#ff3141',
  CANCELLED: '#ccc',
};

const statusLabel: Record<string, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  OVERDUE: '逾期',
  CANCELLED: '已取消',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { bills, apartments, tenants, settlementPeriods, selectedApartmentId, setSelectedApartment, deposits } = useRentStore();

  const currentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);
  const totalRent = currentBills.reduce((s, b) => s + b.totalAmount, 0);
  const paidBills = currentBills.filter((b) => b.status === 'PAID');
  const paidRent = paidBills.reduce((s, b) => s + b.totalAmount, 0);
  const pendingBills = currentBills.filter((b) => b.status === 'PENDING');
  const overdueBills = currentBills.filter((b) => b.status === 'OVERDUE');
  const collectionRate = totalRent > 0 ? (paidRent / totalRent) * 100 : 0;
  const currentTenants = tenants.filter((t) => t.apartmentId === selectedApartmentId);
  const openPeriods = settlementPeriods.filter((p) => p.apartmentId === selectedApartmentId && p.status !== 'SETTLED');
  const heldDeposits = deposits.filter((d) => d.apartmentId === selectedApartmentId && d.status === 'HELD');
  const heldDepositTotal = heldDeposits.reduce((s, d) => s + d.depositAmount, 0);

  const recentPaidBills = useMemo(
    () =>
      paidBills
        .sort((a, b) => dayjs(b.paidAt ?? '').valueOf() - dayjs(a.paidAt ?? '').valueOf())
        .slice(0, 5),
    [paidBills]
  );

  return (
    <div className="page-dashboard">
      <div className="section-title">选择公寓</div>
      <div className="apartment-selector">
        {apartments.map((apt) => (
          <div
            key={apt.id}
            className={`apartment-chip ${selectedApartmentId === apt.id ? 'active' : ''}`}
            onClick={() => setSelectedApartment(apt.id)}
          >
            {apt.name}
          </div>
        ))}
      </div>

      <div className="section-title">收租概览</div>
      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-label">总应收</div>
          <div className="stat-value primary">{formatMoney(totalRent)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">已收金额</div>
          <div className="stat-value success">{formatMoney(paidRent)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">待收笔数</div>
          <div className="stat-value warning">{pendingBills.length}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">逾期笔数</div>
          <div className="stat-value danger">{overdueBills.length}</div>
        </Card>
      </div>

      <div className="section-title">收缴率</div>
      <Card className="progress-card">
        <div className="progress-header">
          <span>收缴率</span>
          <span className="progress-percent">{collectionRate.toFixed(1)}%</span>
        </div>
        <ProgressBar percent={collectionRate} style={{ '--track-width': '8px' }} />
        <div className="progress-sub">
          <span>押金在押: {heldDeposits.length}笔</span>
          <span className="progress-sub-value">{formatMoney(heldDepositTotal)}</span>
        </div>
      </Card>

      {recentPaidBills.length > 0 && (
        <>
          <div className="section-title">最近收款流水</div>
          <Card className="flow-card">
            {recentPaidBills.map((bill) => (
              <div
                key={bill.id}
                className="flow-item"
                onClick={() => navigate(`/bills/${bill.id}`)}
              >
                <div className="flow-info">
                  <div className="flow-tenant">{bill.tenantName} · {bill.roomNumber}</div>
                  <div className="flow-meta">
                    {bill.paymentInfo ? PaymentMethodLabel[bill.paymentInfo.method] : ''}
                    {bill.paidAt ? ` · ${bill.paidAt.slice(5, 16)}` : ''}
                  </div>
                </div>
                <div className="flow-amount">
                  +{formatMoney(bill.totalAmount)}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="section-title">当前租户 ({currentTenants.length})</div>
      <Card className="tenant-list-card">
        {currentTenants.map((t) => {
          const tenantBill = currentBills.find((b) => b.tenantId === t.id);
          return (
            <div key={t.id} className="tenant-item">
              <div className="tenant-info">
                <div className="tenant-name">{t.name}</div>
                <div className="tenant-room">{t.roomNumber}</div>
              </div>
              {tenantBill && (
                <Tag color={statusColor[tenantBill.status]} fill="outline">
                  {statusLabel[tenantBill.status]}
                </Tag>
              )}
            </div>
          );
        })}
      </Card>

      {openPeriods.length > 0 && (
        <>
          <div className="section-title">待对账</div>
          <Card>
            {openPeriods.map((p) => (
              <div key={p.id} className="recon-item">
                <span>{p.yearMonth}</span>
                <Tag color={p.status === 'RECONCILING' ? '#ff8f1f' : '#1677ff'} fill="outline">
                  {p.status === 'RECONCILING' ? '对账中' : '待对账'}
                </Tag>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
