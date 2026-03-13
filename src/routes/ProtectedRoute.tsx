// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/core/authService';
 
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();

  if (!authService.hasSession()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}