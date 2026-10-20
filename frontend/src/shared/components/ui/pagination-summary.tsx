import { cn } from '../../lib/utils';

export interface PaginationSummaryProps {
  desde: number;
  hasta: number;
  total: number;
  etiqueta?: string;
  className?: string;
}

export function PaginationSummary({
  desde,
  hasta,
  total,
  etiqueta = 'registros',
  className,
}: PaginationSummaryProps) {
  return (
    <p className={cn('text-sm text-slate-500', className)}>
      Mostrando <span className="font-medium text-slate-700">{desde}</span>–
      <span className="font-medium text-slate-700">{hasta}</span> de{' '}
      <span className="font-medium text-slate-700">{total}</span> {etiqueta}
    </p>
  );
}
