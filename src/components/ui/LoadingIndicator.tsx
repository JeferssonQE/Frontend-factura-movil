import type React from 'react';

interface LoadingIndicatorProps {
  label: string;
  size?: 'md' | 'lg';
}

// Las animaciones fm-breathe y fm-dot viven en index.css y las comparte con LoadingScreen.
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ label, size = 'lg' }) => (
  <div role="status" className="flex flex-col items-center justify-center gap-3">
    <img
      src="/logo-icon.png"
      alt=""
      className={size === 'lg' ? 'size-20' : 'size-14'}
      style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
    />
    <p className="text-sm font-medium text-slate-600">{label}</p>
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block size-1 rounded-full bg-accent"
          style={{ animation: `fm-dot 3s ease-in-out ${i * 0.55}s infinite` }}
        />
      ))}
    </div>
  </div>
);

export default LoadingIndicator;
