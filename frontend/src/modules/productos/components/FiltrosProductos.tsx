import { SearchX } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Select } from '../../../shared/components/ui/select';
import type { FiltroEstado } from '../types';

import { SelectorEstado } from './SelectorEstado';
import { CATEGORIAS_FILTRO, esFiltroCategoria, etiquetaCategoria } from './filtrosDeProductos';
import type { FiltroCategoria, OpcionSeccion } from './filtrosDeProductos';

function SelectorCategoria({
  categoria,
  onCategoria,
}: {
  categoria: FiltroCategoria;
  onCategoria: (valor: FiltroCategoria) => void;
}) {
  return (
    <Select
      aria-label="Filtrar por categoría"
      value={categoria}
      onChange={(evento) => {
        if (esFiltroCategoria(evento.target.value)) onCategoria(evento.target.value);
      }}
    >
      {CATEGORIAS_FILTRO.map((c) => (
        <option key={c} value={c}>
          {etiquetaCategoria(c)}
        </option>
      ))}
    </Select>
  );
}

function SelectorSeccion({
  seccionId,
  onSeccion,
  opciones,
}: {
  seccionId: string;
  onSeccion: (valor: string) => void;
  opciones: OpcionSeccion[];
}) {
  return (
    <Select
      aria-label="Filtrar por sección"
      value={seccionId}
      onChange={(evento) => onSeccion(evento.target.value)}
    >
      <option value="TODAS">Todas las secciones</option>
      {opciones.map((seccion) => (
        <option key={seccion.id} value={String(seccion.id)}>
          {seccion.nombre}
        </option>
      ))}
    </Select>
  );
}

export interface FiltrosProductosProps {
  busqueda: string;
  onBusqueda: (valor: string) => void;
  categoria: FiltroCategoria;
  onCategoria: (valor: FiltroCategoria) => void;
  seccionId: string;
  onSeccion: (valor: string) => void;
  opcionesSeccion: OpcionSeccion[];
  estado: FiltroEstado;
  onEstado: (estado: FiltroEstado) => void;
}

/** Búsqueda y filtros del listado; todo lo que muestra filtra de verdad. */
export function FiltrosProductos({
  busqueda,
  onBusqueda,
  categoria,
  onCategoria,
  seccionId,
  onSeccion,
  opcionesSeccion,
  estado,
  onEstado,
}: FiltrosProductosProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <SearchInput
        type="search"
        aria-label="Buscar productos"
        placeholder="Buscar por nombre"
        value={busqueda}
        onChange={(evento) => onBusqueda(evento.target.value)}
        onLimpiar={() => onBusqueda('')}
      />
      <SelectorCategoria categoria={categoria} onCategoria={onCategoria} />
      <SelectorSeccion seccionId={seccionId} onSeccion={onSeccion} opciones={opcionesSeccion} />
      <SelectorEstado estado={estado} onCambiar={onEstado} />
    </div>
  );
}

export function SinResultadosConFiltros({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="space-y-3">
      <EmptyState
        icono={SearchX}
        titulo="Sin resultados con estos filtros"
        descripcion="Ningún producto de lo cargado coincide con la búsqueda o los filtros."
      />
      <div className="flex justify-center">
        <Button variant="brand-outline" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
