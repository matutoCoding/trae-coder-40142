import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import TabBar from './components/TabBar';
import Dashboard from './pages/Dashboard';
import DiscountConfig from './pages/DiscountConfig';
import BillList from './pages/BillList';
import BillDetail from './pages/BillDetail';
import Commission from './pages/Commission';
import Settlement from './pages/Settlement';
import Deposit from './pages/Deposit';
import TenantLedger from './pages/TenantLedger';
import './App.css';

const Layout: React.FC = () => (
  <div className="app-layout">
    <div className="app-content">
      <Outlet />
    </div>
    <TabBar />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discount" element={<DiscountConfig />} />
          <Route path="/bills" element={<BillList />} />
          <Route path="/bills/:id" element={<BillDetail />} />
          <Route path="/commission" element={<Commission />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/tenant/:tenantId" element={<TenantLedger />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
