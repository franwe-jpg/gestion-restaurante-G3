import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface FilterBarProps {
  children: ReactNode;
  acciones?: ReactNode;
  className?: string;
}

export function FilterBar({ children, acciones, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">{children}</div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}
