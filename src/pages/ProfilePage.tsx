// src/pages/ProfilePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Profile from '../views/Profile';
import { useAppData } from '../context/AppDataContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeSender, saveSender, deleteSender, logout, isAdmin } = useAppData();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Profile
      user={user}
      sender={activeSender}
      isAdmin={isAdmin}
      onSaveSender={saveSender}
      onDeleteSender={() => {
        if (activeSender) {
          deleteSender(activeSender.id);
        }
      }}
      onGoToAdmin={() => navigate('/admin/users')}
      onLogout={handleLogout}
    />
  );
};

export default ProfilePage;
