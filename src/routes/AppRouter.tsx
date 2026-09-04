// routes/AppRouter.tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import AboutPage from '../pages/AboutPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import BillingPage from '../pages/BillingPage';
import ClientsPage from '../pages/ClientsPage';
import ContadorSendersPage from '../pages/ContadorSendersPage';
import DashboardPage from '../pages/DashboardPage';
import FeedbackPage from '../pages/FeedbackPage';
import HistoryPage from '../pages/HistoryPage';
import InventoryPage from '../pages/InventoryPage';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import OnboardingPage from '../pages/OnboardingPage';
import ProductsPage from '../pages/ProductsPage';
import ProfilePage from '../pages/ProfilePage';
import AdminRoute from './AdminRoute';
import ContadorRoute from './ContadorRoute';
import ProtectedRoute from './ProtectedRoute';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
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
