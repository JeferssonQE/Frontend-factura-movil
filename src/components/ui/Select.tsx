import { ChevronDown } from 'lucide-react';
import type React from 'react';
import { useId } from 'react';

interface SelectProps extends Omit<React.ComponentPropsWithRef<'select'>, 'size'> {
  label?: string;
  // sm es para filas de controles (tablas de administracion); en un formulario va md.
  size?: 'md' | 'sm';
}

const SIZE_CLASSES = {
  md: 'min-h-12 w-full py-3 pl-4 pr-10 text-sm',
  sm: 'min-h-9 w-auto py-1.5 pl-3 pr-8 text-xs font-medium',
};

const CHEVRON_CLASSES = {
  md: 'right-4',
  sm: 'right-2.5',
};

const Select: React.FC<SelectProps> = ({
  label,
  size = 'md',
  id,
  className = '',
  children,
  ...rest
}) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={[
            'cursor-pointer appearance-none rounded-control border border-slate-200 bg-white',
            'text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-50',
            'focus:border-accent focus:ring-2 focus:ring-accent/30',
            SIZE_CLASSES[size],
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={size === 'sm' ? 12 : 16}
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${CHEVRON_CLASSES[size]}`}
        />
      </div>
    </div>
  );
};

export default Select;
