import { AlertTriangle } from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';
import Button from './Button';
import Modal from './Modal';

interface ConfirmDeleteDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// El foco arranca en Cancelar: con la accion destructiva a un Enter de distancia, el
// valor por defecto tiene que ser no hacer nada.
const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={title}
      description={message}
      icon={<AlertTriangle size={28} />}
      iconTone="danger"
      role="alertdialog"
      initialFocusRef={cancelRef}
      onClose={onCancel}
    >
      <div className="flex flex-col gap-2">
        <Button variant="danger" fullWidth loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button ref={cancelRef} variant="outline" fullWidth disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteDialog;
