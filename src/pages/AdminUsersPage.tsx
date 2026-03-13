// src/pages/AdminUsersPage.tsx
import React from 'react';
import { useAppData } from '../context/AppDataContext';

const AdminUsersPage: React.FC = () => {
  const { isAdmin } = useAppData();

  if (!isAdmin) return null;

  return (
    <div className="p-6 text-center text-slate-500">
      {/* TODO: Implementar gestión de usuarios admin */}
      <p className="text-sm">Gestión de usuarios (próximamente)</p>
    </div>
  );
};

export default AdminUsersPage;
