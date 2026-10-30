import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  valor: string;
  onCambiar: (id: string) => void;
  className?: string;
}

export function Tabs({ items, valor, onCambiar, className }: TabsProps) {
  const itemActivo = items.find((item) => item.id === valor) ?? items[0];

  return (
    <div className={cn('space-y-4', className)}>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === valor}
            onClick={() => onCambiar(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
              item.id === valor
                ? 'border-amber-700 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {item.etiqueta}
          </button>
        ))}
      </div>
      <div role="tabpanel">{itemActivo?.contenido}</div>
    </div>
  );
}
