import type React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
  'aria-label': string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  title,
  'aria-label': ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    title={title}
    disabled={disabled}
    onClick={onChange}
    className="flex h-11 shrink-0 items-center disabled:cursor-not-allowed disabled:opacity-40"
  >
    <span
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-success' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </span>
  </button>
);

export default Switch;
