import { X } from 'lucide-react';
import type React from 'react';
import { useEffect, useId, useRef } from 'react';
import Button from './Button';

type IconTone = 'danger' | 'accent' | 'neutral';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  iconTone?: IconTone;
  role?: 'dialog' | 'alertdialog';
  // center: aviso o confirmacion corta. form: formulario, con titulo a la izquierda y un
  // boton de cerrar visible, porque quien lo llena necesita poder salir sin terminar.
  layout?: 'center' | 'form';
  // Hacia donde va el foco al abrir. Sin esto va al panel, que es lo correcto para un
  // formulario; un dialogo destructivo lo manda al boton de cancelar.
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const ICON_TONE_CLASSES: Record<IconTone, string> = {
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/10 text-accent',
  neutral: 'bg-slate-100 text-slate-600',
};

const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  description,
  icon,
  iconTone = 'neutral',
  role = 'dialog',
  layout = 'center',
  initialFocusRef,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isForm = layout === 'form';

  useEffect(() => {
    const requested = initialFocusRef?.current;
    if (requested) {
      requested.focus();
      return;
    }
    // Un campo con autoFocus ya se llevo el foco al montarse: no se lo quitamos.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, [initialFocusRef]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: con teclado se cierra con Escape y con el boton de cancelar; el clic en el fondo es solo comodidad para el mouse
    <div
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role solo puede ser dialog o alertdialog y los dos admiten aria-modal; el linter no resuelve un role que llega por prop */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-card bg-white p-6 shadow-xl outline-none ${
          isForm ? 'max-w-md text-left' : 'max-w-sm text-center'
        }`}
      >
        {isForm ? (
          <div className="mb-6 flex items-center gap-3">
            {icon && (
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-control ${ICON_TONE_CLASSES[iconTone]}`}
              >
                {icon}
              </div>
            )}
            <h3 id={titleId} className="flex-1 text-lg font-bold text-slate-900">
              {title}
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </Button>
          </div>
        ) : (
          <>
            {icon && (
              <div
                className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${ICON_TONE_CLASSES[iconTone]}`}
              >
                {icon}
              </div>
            )}
            <h3 id={titleId} className="mb-2 text-lg font-bold text-slate-900">
              {title}
            </h3>
          </>
        )}

        {description && (
          <p
            id={descriptionId}
            className={`mb-6 text-sm leading-relaxed text-slate-500 ${isForm ? '-mt-3' : ''}`}
          >
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
};

export default Modal;
