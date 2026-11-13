import { Button } from '../../../shared/components/ui/button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Select } from '../../../shared/components/ui/select';
import type { Sector } from '../types';

import { FILTRO_TODOS_LOS_SECTORES } from './useFiltrosDeMesas';
import type { FiltroEstadoMesa } from './useFiltrosDeMesas';

export interface FiltrosDeMesasProps {
  sectores: Sector[];
  sectorId: string;
  estado: FiltroEstadoMesa;
  visibles: number;
  total: number;
  onCambiarSector: (sectorId: string) => void;
  onCambiarEstado: (estado: FiltroEstadoMesa) => void;
  onLimpiar: () => void;
}

interface CampoSectorProps {
  sectores: Sector[];
  sectorId: string;
  onCambiarSector: (sectorId: string) => void;
}

function CampoSector({ sectores, sectorId, onCambiarSector }: CampoSectorProps) {
  return (
    <div className="w-full sm:w-56">
      <label
        htmlFor="filtro-mesas-por-sector"
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        Filtrar por sector
      </label>
      <Select
        id="filtro-mesas-por-sector"
        value={sectorId}
        onChange={(evento) => onCambiarSector(evento.target.value)}
      >
        <option value={FILTRO_TODOS_LOS_SECTORES}>Todos los sectores</option>
        {sectores.map((sector) => (
          <option key={sector.id} value={String(sector.id)}>
            {sector.nombre}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface CampoEstadoProps {
  estado: FiltroEstadoMesa;
  onCambiarEstado: (estado: FiltroEstadoMesa) => void;
}

function CampoEstado({ estado, onCambiarEstado }: CampoEstadoProps) {
  return (
    <div className="w-full sm:w-56">
      <label
        htmlFor="filtro-mesas-por-estado"
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        Filtrar por estado
      </label>
      <Select
        id="filtro-mesas-por-estado"
        value={estado}
        onChange={(evento) => onCambiarEstado(evento.target.value as FiltroEstadoMesa)}
      >
        <option value="TODOS">Todos los estados</option>
        <option value="LIBRE">Libre</option>
        <option value="OCUPADA">Ocupada</option>
        <option value="FUERA_DE_SERVICIO">Fuera de servicio</option>
      </Select>
    </div>
  );
}

function textoConteo(visibles: number, total: number): string {
  if (visibles === total) return `${total} mesas en esta página`;
  return `${visibles} de ${total} mesas de esta página`;
}

/**
 * Filtros del listado y del plano de mesas. Filtran las mesas ya cargadas,
 * sin pedir nada nuevo al backend.
 */
export function FiltrosDeMesas({
  sectores,
  sectorId,
  estado,
  visibles,
  total,
  onCambiarSector,
  onCambiarEstado,
  onLimpiar,
}: FiltrosDeMesasProps) {
  const hayFiltros = sectorId !== FILTRO_TODOS_LOS_SECTORES || estado !== 'TODOS';

  return (
    <FilterBar
      acciones={
        hayFiltros ? (
          <Button variant="ghost" size="sm" onClick={onLimpiar}>
            Limpiar filtros
          </Button>
        ) : undefined
      }
    >
      <CampoSector sectores={sectores} sectorId={sectorId} onCambiarSector={onCambiarSector} />
      <CampoEstado estado={estado} onCambiarEstado={onCambiarEstado} />
      <p className="text-sm text-slate-500 sm:pb-1" role="status">
        {textoConteo(visibles, total)}
      </p>
    </FilterBar>
  );
}
