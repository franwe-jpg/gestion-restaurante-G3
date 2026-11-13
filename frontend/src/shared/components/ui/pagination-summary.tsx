import { cn } from '../../lib/utils';

export interface PaginationSummaryProps {
  desde: number;
  hasta: number;
  total: number;
  etiqueta?: string;
  /** Etiqueta para un único registro; si falta, se usa `etiqueta`. */
  etiquetaSingular?: string;
  className?: string;
}

export function PaginationSummary({
  desde,
  hasta,
  total,
  etiqueta = 'registros',
  etiquetaSingular,
  className,
}: PaginationSummaryProps) {
  const clases = cn('text-sm text-slate-500', className);
  const textoEtiqueta = total === 1 && etiquetaSingular ? etiquetaSingular : etiqueta;

  // Una página fuera de rango no tiene filas: no se muestra un tramo invertido.
  if (desde > hasta) {
    return (
      <p className={clases}>
        Mostrando 0 de {total} {textoEtiqueta}
      </p>
    );
  }

  return (
    <p className={clases}>
      Mostrando{' '}
      <span className="font-medium text-slate-700">
        {desde}–{hasta}
      </span>{' '}
      de {total} {textoEtiqueta}
    </p>
  );
}
