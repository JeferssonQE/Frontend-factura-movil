// components/ClientFormModal.tsx

import { Loader2, UserPlus } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useDebouncedLookup } from '../hooks/useDebouncedLookup';
import { clientSchema } from '../schemas/business';
import { lookupService } from '../services/business/lookupService';
import type { Client } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Notice from './ui/Notice';

interface ClientFormModalProps {
  editingClient: Client | null;
  senderId: number | null;
  onSave: (client: Client) => void;
  onClose: () => void;
}

const DNI_LENGTH = 8;
const RUC_LENGTH = 11;

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

type LookingUp = 'dni' | 'ruc' | null;

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  editingClient,
  senderId,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(editingClient?.name ?? '');
  const [dni, setDni] = useState(editingClient?.dni ?? '');
  const [ruc, setRuc] = useState(editingClient?.ruc ?? '');
  const [phone, setPhone] = useState(editingClient?.phone ?? '');
  const [lookingUp, setLookingUp] = useState<LookingUp>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleDniMatch = useCallback(async (value: string) => {
    setLookingUp('dni');
    const result = await lookupService.lookupDni(value);
    setLookingUp(null);
    if (result?.nombre_completo) setName(result.nombre_completo);
  }, []);

  const handleRucMatch = useCallback(async (value: string) => {
    setLookingUp('ruc');
    const result = await lookupService.lookupRuc(value);
    setLookingUp(null);
    if (result?.razon_social) setName(result.razon_social);
  }, []);

  useDebouncedLookup(dni, DNI_LENGTH, handleDniMatch);
  useDebouncedLookup(ruc, RUC_LENGTH, handleRucMatch);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!senderId) {
      setFormError('Primero configura tu empresa en la sección Perfil.');
      return;
    }

    const result = clientSchema.safeParse({
      name: name.trim(),
      dni: dni.trim(),
      ruc: ruc.trim(),
      phone: phone.trim(),
    });

    if (!result.success) {
      setFormError(result.error.issues[0].message);
      return;
    }

    onSave({
      id: editingClient?.id || Date.now(),
      sender_id: senderId,
      name: result.data.name,
      dni: result.data.dni || null,
      ruc: result.data.ruc || null,
      phone: result.data.phone || null,
    });
    onClose();
  };

  const spinner = <Loader2 size={16} className="animate-spin text-accent" />;

  return (
    <Modal
      layout="form"
      title={editingClient ? 'Editar cliente' : 'Nuevo cliente'}
      icon={<UserPlus size={22} />}
      iconTone="accent"
      onClose={onClose}
    >
      {formError && (
        <div className="mb-4">
          <Notice tone="danger">{formError}</Notice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Razón social o nombre"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="uppercase"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="DNI (8 dígitos)"
            name="dni"
            value={dni}
            inputMode="numeric"
            maxLength={DNI_LENGTH}
            onChange={(event) => setDni(onlyDigits(event.target.value))}
            placeholder="Opcional"
            trailing={lookingUp === 'dni' ? spinner : null}
          />
          <Input
            label="RUC (11 dígitos)"
            name="ruc"
            value={ruc}
            inputMode="numeric"
            maxLength={RUC_LENGTH}
            onChange={(event) => setRuc(onlyDigits(event.target.value))}
            placeholder="Opcional"
            trailing={lookingUp === 'ruc' ? spinner : null}
          />
        </div>

        <Input
          label="Celular / teléfono"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          placeholder="999888777"
        />

        <div className="pt-2">
          <Button type="submit" fullWidth>
            Guardar cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientFormModal;
