import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface TooltipProps {
  contenido: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ contenido, children, className }: TooltipProps) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:block group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100"
      >
        {contenido}
      </span>
    </span>
  );
}
