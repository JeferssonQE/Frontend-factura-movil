// components/EmpresaModal.tsx
//
// Antes pedia tambien el usuario y la clave SOL, y al guardar probaba el acceso contra el
// portal. Eso se fue con el scraper: FactuMovil emite por Factu API y no custodia
// credenciales de SUNAT. Queda la identidad de la empresa, que es lo unico suyo.

import { Building2, Loader2, Lock, Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import { lookupService } from '../services/business/lookupService';
import type { Sender, SenderUpsertInput } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Notice from './ui/Notice';

const RUC_LENGTH = 11;

interface EmpresaModalProps {
  sender: Sender | null;
  canEditIdentity: boolean;
  onSave: (payload: SenderUpsertInput) => Promise<void>;
  onClose: () => void;
}

const EmpresaModal: React.FC<EmpresaModalProps> = ({
  sender,
  canEditIdentity,
  onSave,
  onClose,
}) => {
  const [ruc, setRuc] = useState(sender?.ruc ?? '');
  const [razonSocial, setRazonSocial] = useState(sender?.name ?? '');
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useDebouncedLookup(canEditIdentity ? ruc : '', RUC_LENGTH, async (value) => {
    if (value === sender?.ruc) return;
    setLookingUp(true);
    setFormError(null);
    const result = await lookupService.lookupRuc(value);
    setLookingUp(false);
    if (!result) {
      setRazonSocial('');
      setFormError('No encontramos ese RUC en SUNAT. Verifícalo.');
      return;
    }
    setRazonSocial(result.razon_social);
  });

  const handleRucChange = (value: string) => {
    setRuc(value.replace(/\D/g, '').slice(0, RUC_LENGTH));
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!canEditIdentity) {
      setFormError('El RUC y la razón social los gestiona el administrador.');
      return;
    }
    if (ruc.length !== RUC_LENGTH) {
      setFormError('El RUC debe tener 11 dígitos.');
      return;
    }
    if (!razonSocial) {
      setFormError('Ingresa un RUC válido para traer la razón social.');
      return;
    }
    if (ruc === sender?.ruc) {
      setFormError('No hay cambios para guardar.');
      return;
    }

    try {
      setSubmitting(true);
      await onSave({ name: razonSocial, ruc });
    } catch {
      setFormError('No se pudieron guardar los datos. Intenta de nuevo.');
      return;
    } finally {
      setSubmitting(false);
    }
    onClose();
  };

  return (
    <Modal
      layout="form"
      title="Datos de la empresa"
      description="RUC y razón social"
      icon={<Building2 size={22} />}
      iconTone="accent"
      onClose={onClose}
    >
      {formError && (
        <div className="mb-4">
          <Notice tone="danger">{formError}</Notice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label={<>RUC {!canEditIdentity && <Lock size={12} />}</>}
            value={ruc}
            onChange={(event) => handleRucChange(event.target.value)}
            readOnly={!canEditIdentity}
            inputMode="numeric"
            placeholder="20123456789"
          />
          {!canEditIdentity && (
            <p className="ml-1 mt-1.5 text-xs text-slate-500">
              El RUC y la razón social los gestiona el administrador.
            </p>
          )}
        </div>

        <Input
          label={
            <>
              Razón social <Lock size={12} />
              {lookingUp && <Loader2 size={12} className="animate-spin text-accent" />}
            </>
          }
          value={razonSocial}
          readOnly
          placeholder={canEditIdentity ? 'Se completa con el RUC' : ''}
          className="truncate"
          trailing={canEditIdentity ? <Search size={16} className="text-slate-400" /> : null}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={submitting} disabled={lookingUp}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmpresaModal;
