import { useEffect, useRef, useState } from 'react';

const CYCLING_MESSAGES = [
  'Cargando datos',
  'Cargando productos',
  'Cargando clientes',
  'Cargando ventas',
  'Cargando comprobantes',
];

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const [displayText, setDisplayText] = useState(message ?? CYCLING_MESSAGES[0]);
  const [animClass, setAnimClass] = useState<'in' | 'out'>('in');
  const idxRef = useRef(0);

  useEffect(() => {
    if (message) {
      setDisplayText(message);
      setAnimClass('in');
      return;
    }

    const interval = setInterval(() => {
      setAnimClass('out');
      setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % CYCLING_MESSAGES.length;
        setDisplayText(CYCLING_MESSAGES[idxRef.current]);
        setAnimClass('in');
      }, 350);
    }, 2500);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <img
        src="/logo-icon.svg"
        alt="FactuMovil AI"
        className="w-24 h-24"
        style={{ animation: 'fm-breathe 3s ease-in-out infinite' }}
      />

      <div className="mt-7 h-5 flex items-center justify-center overflow-hidden">
        <span
          className="text-[10px] font-medium tracking-[4px] uppercase text-blue-600"
          style={{
            animation: animClass === 'in'
              ? 'fm-text-in 0.35s ease forwards'
              : 'fm-text-out 0.35s ease forwards',
          }}
        >
          {displayText}
        </span>
      </div>

      <div className="mt-3 flex gap-1.5 items-end h-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1 h-1 rounded-full bg-blue-500"
            style={{ animation: `fm-dot 3s ease-in-out ${i * 0.55}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
