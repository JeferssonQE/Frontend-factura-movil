import type React from 'react';

type CardTone = 'default' | 'muted' | 'danger';

interface CardProps extends React.ComponentPropsWithRef<'div'> {
  tone?: CardTone;
  dashed?: boolean;
}

const BACKGROUND_CLASSES: Record<CardTone, string> = {
  default: 'bg-white',
  muted: 'bg-slate-50',
  danger: 'bg-white',
};

// danger es para una tarjeta con un dato invalido (ej. un item del carrito): cambia el
// borde, no el fondo, para que se vea el problema sin que la lista parezca otra pantalla.
// Un solo color de borde por tarjeta: dos clases border-* a la vez se pisan sin orden fijo.
const borderClasses = (tone: CardTone, dashed: boolean): string => {
  if (tone === 'danger') return 'border-danger ring-2 ring-danger/20';
  return dashed ? 'border-dashed border-slate-300' : 'border-slate-200';
};

// El relleno (padding) lo pone quien la usa: una tarjeta de lista y un estado vacio no
// respiran igual.
const Card: React.FC<CardProps> = ({
  tone = 'default',
  dashed = false,
  className = '',
  children,
  ...rest
}) => (
  <div
    className={[
      'rounded-card border',
      BACKGROUND_CLASSES[tone],
      borderClasses(tone, dashed),
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
