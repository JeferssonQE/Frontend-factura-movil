// src/pages/LoginPage.tsx
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import Login from '../views/Login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAppData();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/dashboard', { replace: true });
  };

  return <Login onLogin={handleLogin} />;
};

export default LoginPage;
