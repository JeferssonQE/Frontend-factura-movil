// src/pages/DashboardPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../views/Dashboard';
import { useAppData } from '../context/AppDataContext';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, activeSender } = useAppData();

  return (
    <Dashboard
      invoices={invoices}
      activeSender={activeSender}
      onEmit={() => navigate('/billing')}
      onHistory={() => navigate('/history')}
    />
  );
};

export default DashboardPage;