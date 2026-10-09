import type React from 'react';
import { useId } from 'react';

interface InputProps extends React.ComponentPropsWithRef<'input'> {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

// Un campo sin label visible necesita aria-label: el placeholder desaparece al escribir y
// no cuenta como nombre para un lector de pantalla.
const Input: React.FC<InputProps> = ({ label, icon, trailing, id, className = '', ...rest }) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'min-h-12 w-full rounded-control border border-slate-200 bg-white py-3 text-sm',
            'text-slate-900 outline-none placeholder:text-slate-400 disabled:bg-slate-50',
            'read-only:bg-slate-100 read-only:text-slate-600',
            'focus:border-accent focus:ring-2 focus:ring-accent/30',
            'aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/30',
            icon ? 'pl-11' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
    </div>
  );
};

export default Input;
