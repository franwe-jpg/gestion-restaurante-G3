import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface DescriptionItem {
  termino: string;
  detalle: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  className?: string;
}

export function DescriptionList({ items, className }: DescriptionListProps) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.termino} className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.termino}
          </dt>
          <dd className="text-sm text-slate-900">{item.detalle}</dd>
        </div>
      ))}
    </dl>
  );
}
