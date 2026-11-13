import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface ItemMenu {
  etiqueta: string;
  onSelect: () => void;
  icono?: LucideIcon;
  peligro?: boolean;
  /** Marca el item como elegido (muestra tilde y texto para lectores). */
  seleccionado?: boolean;
  /** Dibuja un separador antes del item para agrupar secciones. */
  separadorAntes?: boolean;
}

export interface DropdownMenuProps {
  items: ItemMenu[];
  etiqueta?: string;
  alinear?: 'left' | 'right';
  className?: string;
  /** Contenido del botón que abre el menú; por defecto, el icono de tres puntos. */
  disparador?: ReactNode;
  /** Bloque superior del panel (encabezado informativo, no interactivo). */
  encabezado?: ReactNode;
}

export function DropdownMenu({
  items,
  etiqueta = 'Abrir menú de acciones',
  alinear = 'right',
  className,
  disparador,
  encabezado,
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
        className={cn(
          'flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          disparador === undefined ? 'h-8 w-8' : 'h-9 min-w-9 gap-1 px-2',
        )}
      >
        {disparador ?? <MoreHorizontal className="h-4 w-4" />}
      </button>

      {abierto && (
        <div
          role="menu"
          className={cn(
            'absolute z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg',
            alinear === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {encabezado}
          {items.map((item) => {
            const Icono = item.icono;
            return (
              <div key={item.etiqueta}>
                {item.separadorAntes && (
                  <div role="separator" aria-hidden="true" className="mx-1 my-1 border-t border-slate-200" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAbierto(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    item.peligro ? 'text-danger' : 'text-slate-700',
                  )}
                >
                  {Icono && <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">
                    {item.etiqueta}
                    {item.seleccionado === true && <span className="sr-only"> (actual)</span>}
                  </span>
                  {item.seleccionado === true && (
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
