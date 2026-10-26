import { Select } from '../../../shared/components/ui/select';
import type { FiltroEstado } from '../types';

import { FILTROS_ESTADO } from './filtrosEstado';

function esFiltroEstado(valor: string): valor is FiltroEstado {
  return FILTROS_ESTADO.some((filtro) => filtro.valor === valor);
}

interface SelectorEstadoProps {
  estado: FiltroEstado;
  onCambiar: (estado: FiltroEstado) => void;
}

export function SelectorEstado({ estado, onCambiar }: SelectorEstadoProps) {
  return (
    <Select
      aria-label="Filtrar por estado"
      className="sm:w-56"
      value={estado}
      onChange={(evento) => {
        if (esFiltroEstado(evento.target.value)) onCambiar(evento.target.value);
      }}
    >
      {FILTROS_ESTADO.map((opcion) => (
        <option key={opcion.valor} value={opcion.valor}>
          {opcion.etiqueta}
        </option>
      ))}
    </Select>
  );
}
