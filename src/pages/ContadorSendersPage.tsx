import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { contadorService, type SenderFormData } from '../services/business/contadorService';
import type { AdminUserRow, Sender } from '../types';
import ContadorSenders from '../views/ContadorSenders';

const ContadorSendersPage: React.FC = () => {
  const { user, showToast, selectSenderAsContador } = useAppData();
  const navigate = useNavigate();

  const [empresas, setEmpresas] = useState<AdminUserRow[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [sender, setSender] = useState<Sender | null>(null);
  const [senderLoading, setSenderLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    contadorService
      .getMyAssignedEmpresas()
      .then(setEmpresas)
      .catch(console.error)
      .finally(() => setEmpresasLoading(false));
  }, []);

  const handleSelectEmpresa = useCallback(async (empresaId: string) => {
    setSelectedEmpresaId(empresaId);
    setSender(null);
    setSenderLoading(true);
    try {
      const loaded = await contadorService.getEmpresaSender(empresaId);
      setSender(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      setSenderLoading(false);
    }
  }, []);

  const handleSaveSender = useCallback(
    async (data: SenderFormData) => {
      if (!selectedEmpresaId) return;
      setSaving(true);
      try {
        const updated = await contadorService.updateEmpresaSender(selectedEmpresaId, data);
        setSender(updated);
        showToast('Emisor actualizado correctamente', 'success');
      } catch (e) {
        console.error(e);
        showToast('Error al guardar el emisor', 'error');
      } finally {
        setSaving(false);
      }
    },
    [selectedEmpresaId, showToast],
  );

  const handleOperar = useCallback(
    (sender: Sender) => {
      selectSenderAsContador(sender.id, [sender]);
      navigate('/billing');
    },
    [selectSenderAsContador, navigate],
  );

  if (!user) return null;

  return (
    <ContadorSenders
      user={user}
      empresas={empresas}
      loading={empresasLoading}
      selectedEmpresaId={selectedEmpresaId}
      sender={sender}
      senderLoading={senderLoading}
      saving={saving}
      onSelectEmpresa={handleSelectEmpresa}
      onSaveSender={handleSaveSender}
      onOperar={handleOperar}
    />
  );
};

export default ContadorSendersPage;
