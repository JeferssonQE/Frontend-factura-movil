import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type React from 'react';
import Button from './Button';

type NoticeTone = 'warning' | 'success' | 'danger' | 'info';

interface NoticeProps {
  tone: NoticeTone;
  onDismiss?: () => void;
  children: React.ReactNode;
}

const TONE_CLASSES: Record<NoticeTone, string> = {
  warning: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-accent/30 bg-accent/10 text-primary',
};

const TONE_ICONS = {
  warning: AlertTriangle,
  danger: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const Notice: React.FC<NoticeProps> = ({ tone, onDismiss, children }) => {
  const Icon = TONE_ICONS[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-card border p-4 ${TONE_CLASSES[tone]}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm font-medium leading-snug">{children}</div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="-my-2 -mr-2 text-current hover:bg-black/5 hover:text-current"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
};

export default Notice;
