// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../views/Dashboard';
import { useAppData } from '../context/AppDataContext';
import {
  reportsService,
  DashboardSummary,
  SalesByMonthItem,
} from '../services/business/reportsService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, activeSender, dataReady } = useAppData();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesByMonth, setSalesByMonth] = useState<SalesByMonthItem[]>([]);

  useEffect(() => {
    if (!dataReady || !activeSender) return;

    reportsService.getDashboardSummary().then(setSummary).catch(() => {});
    reportsService.getSalesByMonth().then(setSalesByMonth).catch(() => {});
  }, [dataReady, activeSender]);

  return (
    <Dashboard
      invoices={invoices}
      activeSender={activeSender}
      summary={summary}
      salesByMonth={salesByMonth}
      onEmit={() => navigate('/billing')}
      onHistory={() => navigate('/history')}
    />
  );
};

export default DashboardPage;
