// routes/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import LoadingScreen from '../components/LoadingScreen';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return <>{children}</>;
}
