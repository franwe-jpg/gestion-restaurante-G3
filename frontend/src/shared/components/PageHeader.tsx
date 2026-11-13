import React from 'react';
import { cn } from '../lib/utils';

export interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  className?: string;
}

export function PageHeader({ titulo, descripcion, acciones, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-balance text-slate-900 sm:text-2xl">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm text-pretty text-slate-500">{descripcion}</p>
        )}
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{acciones}</div>
      )}
    </header>
  );
}
