import type React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { UserRole } from '../types';

interface ContadorRouteProps {
  children: React.ReactNode;
}

const ContadorRoute: React.FC<ContadorRouteProps> = ({ children }) => {
  const { user } = useAppData();

  if (user?.role !== UserRole.CONTADOR) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ContadorRoute;
