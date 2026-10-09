import type React from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  // Categoria (rol, plan), no estado: el texto va en primary porque accent sobre su propia
  // transparencia no llega al contraste minimo.
  info: 'bg-accent/10 text-primary',
  neutral: 'bg-slate-100 text-slate-600',
};

const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
  >
    {children}
  </span>
);

export default Badge;
