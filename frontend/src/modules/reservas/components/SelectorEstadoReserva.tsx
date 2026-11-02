import { Select } from '../../../shared/components/ui/select';
import type { FiltroEstadoReserva } from '../types';

import { ESTADOS_RESERVA, OPCIONES_FILTRO_ESTADO } from './estadosReserva';

function esFiltroEstado(valor: string): valor is FiltroEstadoReserva {
  return OPCIONES_FILTRO_ESTADO.some((opcion) => opcion === valor);
}

export interface SelectorEstadoReservaProps {
  estado: FiltroEstadoReserva;
  onCambiar: (estado: FiltroEstadoReserva) => void;
}

/** Las cuatro etiquetas de estado de la tabla más «Todas», que no envía `estado` a la API. */
export function SelectorEstadoReserva({ estado, onCambiar }: SelectorEstadoReservaProps) {
  return (
    <Select
      aria-label="Filtrar por estado"
      className="sm:w-56"
      value={estado}
      onChange={(evento) => {
        if (esFiltroEstado(evento.target.value)) onCambiar(evento.target.value);
      }}
    >
      {OPCIONES_FILTRO_ESTADO.map((opcion) => (
        <option key={opcion} value={opcion}>
          {opcion === 'TODAS' ? 'Todas' : ESTADOS_RESERVA[opcion].etiqueta}
        </option>
      ))}
    </Select>
  );
}
