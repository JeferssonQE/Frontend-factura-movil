// routes/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { authService } from '../services/core/authService';
import type { AuthUser } from '../types';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = authService.getStoredUser<AuthUser>();

  if (!authService.hasSession()) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
