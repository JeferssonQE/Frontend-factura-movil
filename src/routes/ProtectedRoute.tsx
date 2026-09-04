// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { useAppData } from '../context/AppDataContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authLoading, dataReady, user } = useAppData();
  const location = useLocation();

  if (authLoading) {
    return <LoadingScreen message="Iniciando sesión" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!dataReady) {
    return <LoadingScreen />;
  }

  if (user.must_change_password && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
