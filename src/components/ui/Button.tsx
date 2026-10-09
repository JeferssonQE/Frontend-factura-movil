import { Loader2 } from 'lucide-react';
import type React from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger' | 'danger-soft';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90',
  secondary: 'bg-secondary text-white hover:bg-secondary/90',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
  success: 'bg-success text-white hover:bg-success/90',
  danger: 'bg-danger text-white hover:bg-danger/90',
  // Accion destructiva que no es la principal de la pantalla: avisa sin competir con ella.
  'danger-soft': 'bg-danger/10 text-danger hover:bg-danger/20',
};

// 44px es el minimo comodo para un dedo: por eso el alto y el lado del icono. icon-sm es
// para filas de lista donde dos botones de 44px no caben; nunca para una accion principal.
const SIZE_CLASSES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-5',
  lg: 'min-h-14 px-6 text-base',
  icon: 'size-11',
  'icon-sm': 'size-9',
  'icon-lg': 'size-14',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-control text-sm font-semibold',
      'transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
);

export default Button;
