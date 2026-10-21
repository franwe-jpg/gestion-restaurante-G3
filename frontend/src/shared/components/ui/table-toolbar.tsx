import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface TableToolbarProps {
  children: ReactNode;
  acciones?: ReactNode;
  className?: string;
}

export function TableToolbar({ children, acciones, className }: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}
