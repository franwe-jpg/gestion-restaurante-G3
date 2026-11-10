import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Tabs } from '../ui/tabs';

import type { CantidadesPorEstado, FiltroDelMapa, FiltroEstado, SectorDelMapa } from './types';

export interface FiltrosDelMapaProps {
  filtro: FiltroDelMapa;
  sectores: SectorDelMapa[];
  cantidades: CantidadesPorEstado;
  total: number;
  onCambiar: (filtro: FiltroDelMapa) => void;
}

function pestanas(cantidades: CantidadesPorEstado, total: number) {
  const items: [FiltroEstado, string, number][] = [
    ['TODAS', 'Todas', total],
    ['LIBRES', 'Libres', cantidades.libres],
    ['CON_RESERVA', 'Con reserva', cantidades.conReserva],
    ['OCUPADAS', 'Ocupadas', cantidades.ocupadas],
    ['FUERA_DE_SERVICIO', 'Fuera de servicio', cantidades.fueraDeServicio],
  ];
  return items.map(([id, etiqueta, cantidad]) => ({
    id,
    etiqueta: `${etiqueta} (${cantidad})`,
    contenido: null,
  }));
}

/** Estado (pestañas con cantidades) y sector (selector); las cantidades siguen al sector. */
export function FiltrosDelMapa({
  filtro,
  sectores,
  cantidades,
  total,
  onCambiar,
}: FiltrosDelMapaProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <Tabs
        className="space-y-0"
        items={pestanas(cantidades, total)}
        valor={filtro.estado}
        onCambiar={(estado) => onCambiar({ ...filtro, estado: estado as FiltroEstado })}
      />
      <div className="w-48 space-y-1">
        <Label htmlFor="filtro-sector">Sector</Label>
        <Select
          id="filtro-sector"
          value={filtro.sectorId ?? ''}
          onChange={(evento) =>
            onCambiar({
              ...filtro,
              sectorId: evento.target.value === '' ? null : Number(evento.target.value),
            })
          }
        >
          <option value="">Todos los sectores</option>
          {sectores.map((sector) => (
            <option key={sector.id} value={sector.id}>
              {sector.nombre}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
