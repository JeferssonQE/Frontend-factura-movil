// src/pages/AdminUsersPage.tsx
import type React from 'react';
import { useAppData } from '../context/AppDataContext';
import AdminUsers from '../views/AdminUsers';

const AdminUsersPage: React.FC = () => {
  const { user, isAdmin } = useAppData();

  if (!isAdmin) return null;

  return <AdminUsers currentUserId={user?.id ?? ''} />;
};

export default AdminUsersPage;
