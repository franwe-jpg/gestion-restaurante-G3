import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { TabItem } from '../../../shared/components/ui/tabs';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import type { Chef, Mesa, Mozo, Sector } from '../types';

import { ChefsTabla } from './ChefsTabla';
import { FiltrosDeMesas } from './FiltrosDeMesas';
import { useFiltrosDeMesas } from './useFiltrosDeMesas';
import { MesasTabla } from './MesasTabla';
import { MozosTabla } from './MozosTabla';
import { PlanoDelSalon } from './PlanoDelSalon';
import { ResumenDelSalon } from './ResumenDelSalon';
import { SectoresTabla } from './SectoresTabla';
import { useBajaChef } from './useBajaChef';
import { useBajaMesa } from './useBajaMesa';
import { useBajaMozo } from './useBajaMozo';
import { useChefsDelSalon } from './useChefsDelSalon';
import { useMesasDelSalon } from './useMesasDelSalon';
import { useMozosDelSalon } from './useMozosDelSalon';

interface SeccionListadoProps {
  paginacion: EstadoPaginacion;
  filas: object[];
  nombreArchivo: string;
  etiqueta: string;
  etiquetaSingular: string;
  encabezado?: ReactNode;
  children: ReactNode;
}

function SeccionListado({
  paginacion,
  filas,
  nombreArchivo,
  etiqueta,
  etiquetaSingular,
  encabezado,
  children,
}: SeccionListadoProps) {
  const { total } = paginacion;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <TableToolbar acciones={<ExportButton filas={filas} nombreArchivo={nombreArchivo} />}>
          {encabezado}
        </TableToolbar>
        {children}
        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PaginationSummary
              desde={paginacion.offset + 1}
              hasta={Math.min(paginacion.offset + filas.length, total)}
              total={total}
              etiqueta={etiqueta}
              etiquetaSingular={etiquetaSingular}
            />
            {paginacion.totalPaginas > 1 && (
              <Pagination
                pagina={paginacion.pagina}
                totalPaginas={paginacion.totalPaginas}
                onCambiarPagina={paginacion.irAPagina}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface SeccionSectoresProps {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  paginacion: EstadoPaginacion;
  onReintentar: () => void;
  /** Sin `SALON_GESTIONAR` no se pasan `onEditar` ni `onEliminar`: la tabla es de solo lectura. */
  onEditar?: (sector: Sector) => void;
  onEliminar?: (sector: Sector) => void;
}

function SeccionSectores({ paginacion, ...tabla }: SeccionSectoresProps) {
  return (
    <SeccionListado
      paginacion={paginacion}
      filas={tabla.sectores}
      nombreArchivo="sectores"
      etiqueta="sectores"
      etiquetaSingular="sector"
    >
      <SectoresTabla {...tabla} />
    </SeccionListado>
  );
}

interface SeccionMesasProps {
  mesas: Mesa[];
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  paginacion: EstadoPaginacion;
  gestiona: boolean;
  puedeAbrirComanda: boolean;
  onEditar: (mesa: Mesa) => void;
}

interface ContenidoMesasProps {
  mesasFiltradas: Mesa[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  gestiona: boolean;
  puedeAbrirComanda: boolean;
  eliminar: (mesa: Pick<Mesa, 'id' | 'numero'>) => void;
  onEditar: (mesa: Mesa) => void;
}

function ContenidoMesas({
  mesasFiltradas,
  cargando,
  error,
  recargar,
  gestiona,
  puedeAbrirComanda,
  eliminar,
  onEditar,
}: ContenidoMesasProps) {
  const navegar = useNavigate();
  const abrirComanda = puedeAbrirComanda
    ? (mesa: Mesa) => navegar(`/atencion?mesa=${mesa.id}`)
    : undefined;
  return (
    <div className="space-y-6">
      <PlanoDelSalon
        mesas={mesasFiltradas}
        gestiona={gestiona}
        puedeAbrirComanda={puedeAbrirComanda}
        onEditar={gestiona ? onEditar : undefined}
        onEliminar={gestiona ? (mesa) => void eliminar(mesa) : undefined}
        onAbrirComanda={abrirComanda}
      />
      <section aria-label="Detalle de mesas" className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Detalle de mesas</h3>
        <MesasTabla
          mesas={mesasFiltradas}
          cargando={cargando}
          error={error}
          onReintentar={recargar}
          onEditar={gestiona ? onEditar : undefined}
          onEliminar={gestiona ? (mesa) => void eliminar(mesa) : undefined}
          onAbrirComanda={abrirComanda}
        />
      </section>
    </div>
  );
}

function SeccionMesas({
  mesas,
  sectores,
  cargando,
  error,
  recargar,
  paginacion,
  gestiona,
  puedeAbrirComanda,
  onEditar,
}: SeccionMesasProps) {
  const filtros = useFiltrosDeMesas(mesas);
  const { eliminar } = useBajaMesa({ onEliminada: recargar });

  return (
    <SeccionListado
      paginacion={paginacion}
      filas={filtros.mesasFiltradas}
      nombreArchivo="mesas"
      etiqueta="mesas"
      etiquetaSingular="mesa"
      encabezado={
        <FiltrosDeMesas
          sectores={sectores}
          sectorId={filtros.sectorId}
          estado={filtros.estado}
          visibles={filtros.mesasFiltradas.length}
          total={mesas.length}
          onCambiarSector={filtros.cambiarSector}
          onCambiarEstado={filtros.cambiarEstado}
          onLimpiar={filtros.limpiar}
        />
      }
    >
      <ContenidoMesas
        mesasFiltradas={filtros.mesasFiltradas}
        cargando={cargando}
        error={error}
        recargar={recargar}
        gestiona={gestiona}
        puedeAbrirComanda={puedeAbrirComanda}
        eliminar={(mesa) => void eliminar(mesa)}
        onEditar={onEditar}
      />
    </SeccionListado>
  );
}

function SeccionMozos({
  refresco,
  onEditar,
}: {
  refresco: number;
  onEditar: (mozo: Mozo) => void;
}) {
  const { mozos, cargando, error, recargar, paginacion } = useMozosDelSalon(refresco);
  const { eliminar } = useBajaMozo({ onEliminado: recargar });

  return (
    <SeccionListado
      paginacion={paginacion}
      filas={mozos}
      nombreArchivo="mozos"
      etiqueta="mozos"
      etiquetaSingular="mozo"
    >
      <MozosTabla
        mozos={mozos}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(mozo) => void eliminar(mozo)}
      />
    </SeccionListado>
  );
}

function SeccionChefs({
  refresco,
  onEditar,
}: {
  refresco: number;
  onEditar: (chef: Chef) => void;
}) {
  const { chefs, cargando, error, recargar, paginacion } = useChefsDelSalon(refresco);
  const { eliminar } = useBajaChef({ onEliminado: recargar });

  return (
    <SeccionListado
      paginacion={paginacion}
      filas={chefs}
      nombreArchivo="chefs"
      etiqueta="chefs"
      etiquetaSingular="chef"
    >
      <ChefsTabla
        chefs={chefs}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(chef) => void eliminar(chef)}
      />
    </SeccionListado>
  );
}

export interface SeccionesDelSalonProps extends Omit<SeccionSectoresProps, 'onEditar'> {
  /** Permiso `SALON_GESTIONAR`: habilita las pestañas «Mozos» y «Chefs» y todas las acciones. */
  gestiona: boolean;
  /** Permiso `COMANDAS_OPERAR`: ofrece «Abrir comanda» en las mesas libres. */
  puedeAbrirComanda: boolean;
  pestania: string;
  refrescoMesas: number;
  refrescoMozos: number;
  refrescoChefs: number;
  onCambiarPestania: (id: string) => void;
  onEditarSector: (sector: Sector) => void;
  onEditarMesa: (mesa: Mesa) => void;
  onEditarMozo: (mozo: Mozo) => void;
  onEditarChef: (chef: Chef) => void;
}

interface PestaniasProps extends SeccionesDelSalonProps {
  mesas: Mesa[];
  mesasCargando: boolean;
  mesasError: string | null;
  recargarMesas: () => void;
  paginacionMesas: EstadoPaginacion;
}

function construirPestanias(props: PestaniasProps): TabItem[] {
  const base: TabItem[] = [
    {
      id: 'sectores',
      etiqueta: 'Sectores',
      contenido: (
        <SeccionSectores
          sectores={props.sectores}
          cargando={props.cargando}
          error={props.error}
          paginacion={props.paginacion}
          onReintentar={props.onReintentar}
          onEditar={props.gestiona ? props.onEditarSector : undefined}
          onEliminar={props.gestiona ? props.onEliminar : undefined}
        />
      ),
    },
    {
      id: 'mesas',
      etiqueta: 'Mesas',
      contenido: (
        <SeccionMesas
          mesas={props.mesas}
          sectores={props.sectores}
          cargando={props.mesasCargando}
          error={props.mesasError}
          recargar={props.recargarMesas}
          paginacion={props.paginacionMesas}
          gestiona={props.gestiona}
          puedeAbrirComanda={props.puedeAbrirComanda}
          onEditar={props.onEditarMesa}
        />
      ),
    },
  ];
  if (!props.gestiona) return base;
  return [
    ...base,
    {
      id: 'mozos',
      etiqueta: 'Mozos',
      contenido: <SeccionMozos refresco={props.refrescoMozos} onEditar={props.onEditarMozo} />,
    },
    {
      id: 'chefs',
      etiqueta: 'Chefs',
      contenido: <SeccionChefs refresco={props.refrescoChefs} onEditar={props.onEditarChef} />,
    },
  ];
}

/** Pestañas del módulo: sectores y mesas para quien consulta; mozos y chefs solo para quien gestiona. */
export function SeccionesDelSalon(props: SeccionesDelSalonProps) {
  const mesasDelSalon = useMesasDelSalon(props.refrescoMesas);

  return (
    <div className="space-y-6">
      <ResumenDelSalon
        sectores={props.sectores}
        mesas={mesasDelSalon.mesas}
        cargando={mesasDelSalon.cargando || props.cargando}
      />
      <Tabs
        valor={props.pestania}
        onCambiar={props.onCambiarPestania}
        items={construirPestanias({
          ...props,
          mesas: mesasDelSalon.mesas,
          mesasCargando: mesasDelSalon.cargando,
          mesasError: mesasDelSalon.error,
          recargarMesas: mesasDelSalon.recargar,
          paginacionMesas: mesasDelSalon.paginacion,
        })}
      />
    </div>
  );
}
