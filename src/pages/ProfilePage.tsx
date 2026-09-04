// src/pages/ProfilePage.tsx
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import Profile from '../views/Profile';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeSender, saveSender, logout, isAdmin, isContador, refreshAllData } =
    useAppData();

  const canEditIdentity = isAdmin;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Profile
      user={user}
      sender={activeSender}
      isAdmin={isAdmin}
      isContador={isContador}
      canEditIdentity={canEditIdentity}
      onSaveSender={saveSender}
      onRefresh={refreshAllData}
      onGoToAdmin={() => navigate('/admin/users')}
      onChangeSender={() => navigate('/contador/senders')}
      onLogout={handleLogout}
    />
  );
};

export default ProfilePage;
