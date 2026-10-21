import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
        <Icono className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{descripcion}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
