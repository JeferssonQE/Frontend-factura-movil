// src/pages/ProfilePage.tsx
import React from 'react';
import Profile from '../views/Profile';
import { useAppData } from '../context/AppDataContext';

const ProfilePage: React.FC = () => {
  const { user, activeSender, saveSender, deleteSender, logout } = useAppData();

  return (
    <Profile
      user={user}
      sender={activeSender}
      onSaveSender={saveSender}
      onDeleteSender={() => {
        if (activeSender) {
          deleteSender(activeSender.id);
        }
      }}
      onLogout={logout}
    />
  );
};

export default ProfilePage;
