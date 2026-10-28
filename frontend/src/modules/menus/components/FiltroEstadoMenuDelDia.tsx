import { Select } from '../../../shared/components/ui/select';
import type { FiltroEstado } from '../types';

const OPCIONES: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'HABILITADO', etiqueta: 'Habilitados' },
  { valor: 'DESHABILITADO', etiqueta: 'Deshabilitados' },
  { valor: 'TODOS', etiqueta: 'Todos' },
];

export function FiltroEstadoMenuDelDia({
  estado,
  onCambiar,
}: {
  estado: FiltroEstado;
  onCambiar: (estado: FiltroEstado) => void;
}) {
  return (
    <Select
      aria-label="Filtrar menús por estado"
      className="sm:w-56"
      value={estado}
      onChange={(evento) => {
        const opcion = OPCIONES.find(({ valor }) => valor === evento.target.value);
        if (opcion !== undefined) onCambiar(opcion.valor);
      }}
    >
      {OPCIONES.map((opcion) => (
        <option key={opcion.valor} value={opcion.valor}>
          {opcion.etiqueta}
        </option>
      ))}
    </Select>
  );
}
