// pages/AgentPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AgentView from '../views/Agent';

const AgentPage: React.FC = () => {
  const navigate = useNavigate();
  return <AgentView onNavigateToHistory={() => navigate('/history')} />;
};

export default AgentPage;
