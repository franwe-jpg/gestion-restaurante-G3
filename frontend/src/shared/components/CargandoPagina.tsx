import { Loader2 } from 'lucide-react';

export function CargandoPagina() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Cargando módulo...</span>
    </div>
  );
}
