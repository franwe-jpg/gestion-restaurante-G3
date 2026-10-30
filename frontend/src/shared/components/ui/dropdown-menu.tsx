import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';

export interface ItemMenu {
  etiqueta: string;
  onSelect: () => void;
  icono?: LucideIcon;
  peligro?: boolean;
}

export interface DropdownMenuProps {
  items: ItemMenu[];
  etiqueta?: string;
  alinear?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  items,
  etiqueta = 'Abrir menú de acciones',
  alinear = 'right',
  className,
}: DropdownMenuProps) {
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
    <div ref={contenedorRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {abierto && (
        <div
          role="menu"
          className={cn(
            'absolute z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg',
            alinear === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const Icono = item.icono;
            return (
              <button
                key={item.etiqueta}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
                  item.peligro ? 'text-danger' : 'text-slate-700',
                )}
              >
                {Icono && <Icono className="h-4 w-4" aria-hidden="true" />}
                {item.etiqueta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
