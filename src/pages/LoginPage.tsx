// src/pages/LoginPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../views/Login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Login
      onSuccess={() => {
        navigate('/dashboard', { replace: true });
      }}
    />
  );
};

export default LoginPage;