import { Loader2 } from 'lucide-react';

/** Estado de carga de un módulo: anuncia a lectores de pantalla y muestra avance. */
export function CargandoPagina() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando módulo"
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      <span className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando módulo...
      </span>
      <div aria-hidden="true" className="w-full max-w-md space-y-2">
        <div className="h-3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
