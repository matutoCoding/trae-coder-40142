import React from 'react';
import { Card, ProgressBar, Tag } from 'antd-mobile';
import { useRentStore } from '../store/useStore';
import { formatMoney } from '../core/reconciliator';

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
  const { bills, apartments, tenants, settlementPeriods, selectedApartmentId, setSelectedApartment } = useRentStore();

  const currentBills = bills.filter((b) => b.apartmentId === selectedApartmentId);
  const totalRent = currentBills.reduce((s, b) => s + b.totalAmount, 0);
  const paidRent = currentBills.filter((b) => b.status === 'PAID').reduce((s, b) => s + b.totalAmount, 0);
  const pendingBills = currentBills.filter((b) => b.status === 'PENDING');
  const overdueBills = currentBills.filter((b) => b.status === 'OVERDUE');
  const collectionRate = totalRent > 0 ? (paidRent / totalRent) * 100 : 0;
  const currentTenants = tenants.filter((t) => t.apartmentId === selectedApartmentId);
  const openPeriods = settlementPeriods.filter((p) => p.apartmentId === selectedApartmentId && p.status !== 'SETTLED');

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
          <div className="stat-label">本月应收</div>
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
      </Card>

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
