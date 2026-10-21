import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ErrorPageTone = 'brand' | 'warning' | 'danger';

export interface ErrorPageProps {
  codigo: number;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  tono?: ErrorPageTone;
  acciones?: ReactNode;
}

const TONOS: Record<ErrorPageTone, string> = {
  brand: 'bg-brand-subtle text-brand border-brand-border',
  warning: 'bg-warning-subtle text-warning-strong border-warning-border',
  danger: 'bg-danger-subtle text-danger border-danger-border',
};

export function ErrorPage({
  codigo,
  titulo,
  descripcion,
  icono: Icono,
  tono = 'brand',
  acciones,
}: ErrorPageProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border ${TONOS[tono]}`}
      >
        <Icono className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-widest text-slate-400">{codigo}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
        <p className="mx-auto max-w-md text-sm text-slate-500">{descripcion}</p>
      </div>
      {acciones && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acciones}</div>
      )}
    </section>
  );
}
