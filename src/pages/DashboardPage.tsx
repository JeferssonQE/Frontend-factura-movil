// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../views/Dashboard';
import { useAppData } from '../context/AppDataContext';
import {
  reportsService,
  DashboardSummary,
  IgvSummary,
  SalesByMonthItem,
} from '../services/business/reportsService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, activeSender, activeSenderId, isContador } = useAppData();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesByMonth, setSalesByMonth] = useState<SalesByMonthItem[]>([]);
  const [igvSummary, setIgvSummary] = useState<IgvSummary | null>(null);

  useEffect(() => {
    if (!activeSenderId && !activeSender) return;

    const senderId = isContador ? activeSenderId ?? undefined : undefined;
    reportsService.getDashboardSummary(senderId).then(setSummary).catch(() => {});
    reportsService.getSalesByMonth(undefined, senderId).then(setSalesByMonth).catch(() => {});

    const now = new Date();
    const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dateTo = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    reportsService.getIgvSummary(dateFrom, dateTo, senderId).then(setIgvSummary).catch(() => {});
  }, [activeSenderId, activeSender, isContador]);

  return (
    <Dashboard
      invoices={invoices}
      activeSender={activeSender}
      summary={summary}
      salesByMonth={salesByMonth}
      igvSummary={igvSummary}
      onEmit={() => navigate('/billing')}
      onHistory={() => navigate('/history')}
    />
  );
};

export default DashboardPage;
