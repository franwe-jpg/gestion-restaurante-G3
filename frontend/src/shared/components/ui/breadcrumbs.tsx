import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  etiqueta: string;
  ruta?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Ruta de navegación" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-slate-500">
        {items.map((item, indice) => {
          const esUltimo = indice === items.length - 1;
          return (
            <li key={`${item.etiqueta}-${indice}`} className="flex items-center gap-1">
              {item.ruta && !esUltimo ? (
                <Link to={item.ruta} className="hover:text-slate-900 hover:underline">
                  {item.etiqueta}
                </Link>
              ) : (
                <span className={esUltimo ? 'font-medium text-slate-900' : undefined}>
                  {item.etiqueta}
                </span>
              )}
              {!esUltimo && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
