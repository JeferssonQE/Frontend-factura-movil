// src/pages/ProfilePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Profile from '../views/Profile';
import { useAppData } from '../context/AppDataContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeSender, saveSender, logout, isAdmin, isContador } = useAppData();

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
      onGoToAdmin={() => navigate('/admin/users')}
      onChangeSender={() => navigate('/contador/senders')}
      onLogout={handleLogout}
    />
  );
};

export default ProfilePage;
