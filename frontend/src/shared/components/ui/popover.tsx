import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ trigger, children, className }: PopoverProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const alHacerClicFuera = (event: PointerEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    const alPresionarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('pointerdown', alHacerClicFuera);
    window.addEventListener('keydown', alPresionarTecla);

    return () => {
      document.removeEventListener('pointerdown', alHacerClicFuera);
      window.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative inline-block">
      <div onClick={() => setAbierto((previo) => !previo)}>{trigger}</div>
      {abierto && (
        <div
          role="dialog"
          className={cn(
            'absolute left-0 z-20 mt-2 w-64 rounded-md border border-slate-200 bg-white p-4 text-sm shadow-lg',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
