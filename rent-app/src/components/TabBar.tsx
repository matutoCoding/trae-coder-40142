import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { key: '/', label: '首页', icon: '🏠' },
  { key: '/discount', label: '优惠', icon: '🏷️' },
  { key: '/bills', label: '账单', icon: '📋' },
  { key: '/commission', label: '抽成', icon: '💰' },
  { key: '/settlement', label: '结算', icon: '📊' },
  { key: '/deposit', label: '押金', icon: '🔐' },
];

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = tabs.find((t) => t.key === location.pathname)?.key ?? '/';

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className={`tab-item ${activeKey === tab.key ? 'active' : ''}`}
          onClick={() => navigate(tab.key)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </div>
      ))}
    </div>
  );
};

export default TabBar;
