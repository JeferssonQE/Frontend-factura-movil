interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  // null es "todavia no se eligio nada": ningun segmento aparece marcado.
  value: T | null;
  onChange: (value: T) => void;
  'aria-label'?: string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <fieldset aria-label={ariaLabel} className="flex rounded-control bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-10 flex-1 rounded-control px-2 text-sm font-semibold transition ${
            value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export default SegmentedControl;
