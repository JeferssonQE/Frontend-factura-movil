// src/pages/OnboardingPage.tsx
import type React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { authService } from '../services/core/authService';
import Onboarding from '../views/Onboarding';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeSender, refreshUser, saveSender } = useAppData();

  if (!user?.must_change_password) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChangePassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword);
  };

  const handleSaveSunat = async (sunatUser: string, sunatPass: string) => {
    if (!activeSender) return;
    await saveSender({
      name: activeSender.name,
      ruc: activeSender.ruc,
      sunat_user: sunatUser,
      sunat_pass: sunatPass,
    });
  };

  const handleFinish = async () => {
    await refreshUser();
    navigate('/dashboard', { replace: true });
  };

  return (
    <Onboarding
      sender={activeSender}
      onChangePassword={handleChangePassword}
      onSaveSunat={handleSaveSunat}
      onFinish={handleFinish}
    />
  );
};

export default OnboardingPage;
