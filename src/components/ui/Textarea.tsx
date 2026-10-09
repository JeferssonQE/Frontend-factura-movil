import type React from 'react';
import { useId } from 'react';

interface TextareaProps extends React.ComponentPropsWithRef<'textarea'> {
  label?: React.ReactNode;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, className = '', ...rest }) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={[
          'w-full resize-none rounded-control border border-slate-200 bg-white px-4 py-3 text-sm',
          'text-slate-900 outline-none placeholder:text-slate-400 disabled:bg-slate-50',
          'focus:border-accent focus:ring-2 focus:ring-accent/30',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </div>
  );
};

export default Textarea;
