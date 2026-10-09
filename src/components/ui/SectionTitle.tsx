import type { LucideIcon } from 'lucide-react';
import type React from 'react';

interface SectionTitleProps {
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ icon: Icon, action, children }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <Icon size={18} className="text-accent" />
      <h3 className="text-base font-semibold text-slate-900">{children}</h3>
    </div>
    {action}
  </div>
);

export default SectionTitle;
