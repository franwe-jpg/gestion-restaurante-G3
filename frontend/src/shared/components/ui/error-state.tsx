import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from './button';

export interface ErrorStateProps {
  titulo?: string;
  descripcion: string;
  onReintentar?: () => void;
  textoReintentar?: string;
}

export function ErrorState({
  titulo = 'No se pudieron cargar los datos',
  descripcion,
  onReintentar,
  textoReintentar = 'Reintentar',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-danger-border bg-danger-subtle/40 p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{descripcion}</p>
      {onReintentar && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onReintentar}>
          <RefreshCw className="h-4 w-4" />
          {textoReintentar}
        </Button>
      )}
    </div>
  );
}
