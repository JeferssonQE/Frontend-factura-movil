import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import ContadorSenders from '../views/ContadorSenders';
import { contadorService } from '../services/business/contadorService';
import { AdminUserRow, Sender } from '../types';

const ContadorSendersPage: React.FC = () => {
  const { user, activeSenderId, selectSenderAsContador } = useAppData();
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState<AdminUserRow[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);

  useEffect(() => {
    contadorService.getMyAssignedEmpresas()
      .then(setEmpresas)
      .catch(console.error)
      .finally(() => setEmpresasLoading(false));
  }, []);

  const handleSelectEmpresa = useCallback(async (empresaId: string) => {
    setSelectedEmpresaId(empresaId);
    setSendersLoading(true);
    try {
      const loaded = await contadorService.getSendersForEmpresa(empresaId);
      setSenders(loaded);
    } catch (e) {
      console.error(e);
      setSenders([]);
    } finally {
      setSendersLoading(false);
    }
  }, []);

  const handleSelectSender = useCallback(async (senderId: number) => {
    await selectSenderAsContador(senderId, senders);
    navigate('/dashboard');
  }, [selectSenderAsContador, senders, navigate]);

  if (!user) return null;

  return (
    <ContadorSenders
      user={user}
      empresas={empresas}
      selectedEmpresaId={selectedEmpresaId}
      senders={senders}
      activeSenderId={activeSenderId}
      loading={empresasLoading}
      sendersLoading={sendersLoading}
      onSelectEmpresa={handleSelectEmpresa}
      onSelectSender={handleSelectSender}
    />
  );
};

export default ContadorSendersPage;
