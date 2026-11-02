import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { hoyLocal, sumarDias } from '../fechas';

export interface NavegadorFechaProps {
  /** Día elegido, como `YYYY-MM-DD`. */
  fecha: string;
  onCambiar: (fecha: string) => void;
}

/** Botones de día anterior y siguiente, campo de fecha y «Hoy», como la maqueta. */
export function NavegadorFecha({ fecha, onCambiar }: NavegadorFechaProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="w-9 px-0"
        aria-label="Día anterior"
        onClick={() => onCambiar(sumarDias(fecha, -1))}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Input
        type="date"
        aria-label="Día"
        className="w-44"
        value={fecha}
        onChange={(evento) => {
          if (evento.target.value !== '') onCambiar(evento.target.value);
        }}
      />
      <Button
        variant="outline"
        className="w-9 px-0"
        aria-label="Día siguiente"
        onClick={() => onCambiar(sumarDias(fecha, 1))}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" onClick={() => onCambiar(hoyLocal())}>
        Hoy
      </Button>
    </div>
  );
}
