// routes/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AppLayout from '../layouts/AppLayout';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import BillingPage from '../pages/BillingPage';
import HistoryPage from '../pages/HistoryPage';
import ProductsPage from '../pages/ProductsPage';
import ClientsPage from '../pages/ClientsPage';
import ProfilePage from '../pages/ProfilePage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AgentPage from '../pages/AgentPage';
import FeedbackPage from '../pages/FeedbackPage';
import AboutPage from '../pages/AboutPage';
import ContadorSendersPage from '../pages/ContadorSendersPage';
import ContadorRoute from './ContadorRoute';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/contador/senders"
            element={
              <ContadorRoute>
                <ContadorSendersPage />
              </ContadorRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
