// routes/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/core/authService';

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = authService.getUser();

  if (!authService.hasSession()) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}