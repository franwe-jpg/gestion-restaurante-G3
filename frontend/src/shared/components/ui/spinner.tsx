import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';

export interface SpinnerProps {
  className?: string;
  etiqueta?: string;
}

export function Spinner({ className, etiqueta = 'Cargando...' }: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 text-sm text-slate-500', className)}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{etiqueta}</span>
    </span>
  );
}
