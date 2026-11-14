import { useCallback, useState } from 'react';

import { useSesion } from '../../../shared/auth/useSesion';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { useAbrirDesdeUrl } from '../../../shared/hooks/useAbrirDesdeUrl';
import {
  ComandaDesdeReservaDialog,
  NavegadorFecha,
  ReservaFormDialog,
  ReservasTabla,
  SelectorEstadoReserva,
} from '../components';
import { formatearFechaReserva } from '../fechas';
import type { Reserva } from '../types';

import { useCancelarReserva } from '../components/useCancelarReserva';

import { useListadoReservas } from './useListadoReservas';

/**
 * El modal de reserva: cerrado, para una reserva nueva, para modificar la fila elegida o para crear
 * su comanda. Uno solo a la vez (S36).
 */
type Panel = 'cerrado' | 'alta' | { edicion: Reserva } | { comanda: Reserva };

interface ListadoDelDiaProps {
  listado: ReturnType<typeof useListadoReservas>;
  /** Las cuatro acciones van juntas: sin `RESERVAS_OPERAR` no se pasan. */
  onCrearComanda?: (reserva: Reserva) => void;
  onModificar?: (reserva: Reserva) => void;
  onCancelarAnticipada?: (reserva: Reserva) => void;
  onCancelarPorAusencia?: (reserva: Reserva) => void;
}

/** Resumen del tramo visible y paginador; no se muestra si el día no tiene reservas. */
function PieDelListado({
  paginacion,
  cantidadFilas,
  total,
}: {
  paginacion: ReturnType<typeof useListadoReservas>['paginacion'];
  cantidadFilas: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={paginacion.offset + 1}
        hasta={Math.min(paginacion.offset + cantidadFilas, total)}
        total={total}
        etiqueta="reservas"
        etiquetaSingular="reserva"
      />
      {paginacion.totalPaginas > 1 && (
        <Pagination
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          onCambiarPagina={paginacion.irAPagina}
        />
      )}
    </div>
  );
}

/** Navegador de fecha, filtro de estado, tabla del día y paginación. */
function ListadoDelDia({
  listado,
  onCrearComanda,
  onModificar,
  onCancelarAnticipada,
  onCancelarPorAusencia,
}: ListadoDelDiaProps) {
  const { fecha, estado, paginacion, reservas } = listado;
  const filas = reservas.datos?.items ?? [];
  const total = reservas.datos?.total ?? 0;
  const personas = filas.reduce((suma, fila) => suma + fila.cantidad_personas, 0);
  return (
    <Card aria-label="Listado de reservas del día">
      <CardHeader>
        <CardTitle>Próximas reservas</CardTitle>
        <CardDescription>Reservas del {formatearFechaReserva(fecha)}</CardDescription>
        <p aria-live="polite" className="text-sm text-slate-500">
          {total === 0
            ? 'Sin reservas para los filtros elegidos.'
            : `${total} ${total === 1 ? 'reserva' : 'reservas'} · ${personas} ${personas === 1 ? 'persona' : 'personas'}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TableToolbar acciones={<ExportButton filas={filas} nombreArchivo="reservas" />}>
          <FilterBar className="border-0 p-0">
            <fieldset className="contents">
              <legend className="sr-only">Filtros del listado</legend>
              <NavegadorFecha fecha={fecha} onCambiar={listado.cambiarFecha} />
              <SelectorEstadoReserva estado={estado} onCambiar={listado.cambiarEstado} />
            </fieldset>
          </FilterBar>
        </TableToolbar>

        <ReservasTabla
          reservas={filas}
          cargando={reservas.cargando}
          error={reservas.error}
          onReintentar={reservas.recargar}
          onCrearComanda={onCrearComanda}
          onModificar={onModificar}
          onCancelarAnticipada={onCancelarAnticipada}
          onCancelarPorAusencia={onCancelarPorAusencia}
        />

        <PieDelListado paginacion={paginacion} cantidadFilas={filas.length} total={total} />
      </CardContent>
    </Card>
  );
}

interface ModalDeReservaProps {
  panel: Panel;
  onOpenChange: (abierto: boolean) => void;
  onGuardado: () => void;
}

/**
 * Monta el modal solo mientras debe verse (Decisión 21 y 22): `ComandaDesdeReservaDialog` para
 * crear la comanda de una fila y `ReservaFormDialog` para el alta y la edición. `onGuardado` cierra
 * el panel y vuelve a pedir el listado en los dos casos.
 */
function ModalDeReserva({ panel, onOpenChange, onGuardado }: ModalDeReservaProps) {
  if (panel === 'cerrado') return null;
  if (typeof panel === 'object' && 'comanda' in panel) {
    return (
      <ComandaDesdeReservaDialog
        key={panel.comanda.id}
        reserva={panel.comanda}
        onOpenChange={onOpenChange}
        onCreada={onGuardado}
      />
    );
  }
  const reserva = panel === 'alta' ? undefined : panel.edicion;
  return (
    // La clave reinicia el formulario al pasar de una fila a otra o de la edición al alta.
    <ReservaFormDialog
      key={reserva?.id ?? 'alta'}
      reserva={reserva}
      onOpenChange={onOpenChange}
      onGuardado={onGuardado}
    />
  );
}

export function ReservasPage() {
  const opera = useSesion().puede('RESERVAS_OPERAR');
  const listado = useListadoReservas();
  const [panel, setPanel] = useState<Panel>('cerrado');
  useAbrirDesdeUrl('nueva', () => {
    if (opera) setPanel('alta');
  });
  const { cancelarAnticipada, cancelarPorAusencia } = useCancelarReserva({
    onCancelada: listado.reservas.recargar,
  });

  const alGuardar = () => {
    setPanel('cerrado');
    listado.reservas.recargar();
  };

  // Estable: `onOpenChange` es una dependencia del efecto de foco del `Dialog` (Decisión 22).
  const alCambiarModal = useCallback((abierto: boolean) => {
    if (!abierto) setPanel('cerrado');
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reservas"
        descripcion="Libro de reservas, turnos de almuerzo/cena y confirmación de comensales."
        acciones={
          opera ? (
            <Button
              variant="brand-outline"
              onClick={() => setPanel('alta')}
              disabled={typeof panel === 'object'}
            >
              Nueva reserva
            </Button>
          ) : undefined
        }
      />

      <ListadoDelDia
        listado={listado}
        onCrearComanda={opera ? (reserva) => setPanel({ comanda: reserva }) : undefined}
        onModificar={opera ? (reserva) => setPanel({ edicion: reserva }) : undefined}
        onCancelarAnticipada={opera ? (reserva) => void cancelarAnticipada(reserva) : undefined}
        onCancelarPorAusencia={opera ? (reserva) => void cancelarPorAusencia(reserva) : undefined}
      />
      <ModalDeReserva panel={panel} onOpenChange={alCambiarModal} onGuardado={alGuardar} />
    </div>
  );
}
