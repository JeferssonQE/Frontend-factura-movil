import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import ContadorSenders from '../views/ContadorSenders';

const ContadorSendersPage: React.FC = () => {
  const { user, senders, activeSenderId, dataReady, selectSenderAsContador } = useAppData();
  const navigate = useNavigate();

  const handleSelect = async (senderId: number) => {
    await selectSenderAsContador(senderId);
    navigate('/dashboard');
  };

  if (!user) return null;

  return (
    <ContadorSenders
      user={user}
      senders={senders}
      activeSenderId={activeSenderId}
      loading={!dataReady}
      onSelect={handleSelect}
    />
  );
};

export default ContadorSendersPage;
