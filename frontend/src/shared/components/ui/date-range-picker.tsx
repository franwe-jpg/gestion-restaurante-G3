import { useId } from 'react';

import { cn } from '../../lib/utils';
import { Input } from './input';
import { Label } from './label';

export interface DateRangePickerProps {
  desde: string;
  hasta: string;
  onCambiarDesde: (valor: string) => void;
  onCambiarHasta: (valor: string) => void;
  etiquetaDesde?: string;
  etiquetaHasta?: string;
  className?: string;
}

export function DateRangePicker({
  desde,
  hasta,
  onCambiarDesde,
  onCambiarHasta,
  etiquetaDesde = 'Desde',
  etiquetaHasta = 'Hasta',
  className,
}: DateRangePickerProps) {
  const idBase = useId();
  const idDesde = `${idBase}-desde`;
  const idHasta = `${idBase}-hasta`;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-end', className)}>
      <div className="space-y-1.5">
        <Label htmlFor={idDesde}>{etiquetaDesde}</Label>
        <Input
          id={idDesde}
          type="date"
          value={desde}
          onChange={(event) => onCambiarDesde(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={idHasta}>{etiquetaHasta}</Label>
        <Input
          id={idHasta}
          type="date"
          value={hasta}
          onChange={(event) => onCambiarHasta(event.target.value)}
        />
      </div>
    </div>
  );
}
