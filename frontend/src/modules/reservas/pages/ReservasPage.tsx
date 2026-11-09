import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardDescription, CardHeader } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
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
  onCrearComanda: (reserva: Reserva) => void;
  onModificar: (reserva: Reserva) => void;
  onCancelarAnticipada: (reserva: Reserva) => void;
  onCancelarPorAusencia: (reserva: Reserva) => void;
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegadorFecha fecha={fecha} onCambiar={listado.cambiarFecha} />
        <SelectorEstadoReserva estado={estado} onCambiar={listado.cambiarEstado} />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Reservas del {formatearFechaReserva(fecha)}</CardDescription>
        </CardHeader>
        <ReservasTabla
          reservas={reservas.datos?.items ?? []}
          cargando={reservas.cargando}
          error={reservas.error}
          onReintentar={reservas.recargar}
          onCrearComanda={onCrearComanda}
          onModificar={onModificar}
          onCancelarAnticipada={onCancelarAnticipada}
          onCancelarPorAusencia={onCancelarPorAusencia}
        />
      </Card>

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
  const listado = useListadoReservas();
  const [panel, setPanel] = useState<Panel>('cerrado');
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
          <Button onClick={() => setPanel('alta')} disabled={typeof panel === 'object'}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva reserva
          </Button>
        }
      />

      <ListadoDelDia
        listado={listado}
        onCrearComanda={(reserva) => setPanel({ comanda: reserva })}
        onModificar={(reserva) => setPanel({ edicion: reserva })}
        onCancelarAnticipada={(reserva) => void cancelarAnticipada(reserva)}
        onCancelarPorAusencia={(reserva) => void cancelarPorAusencia(reserva)}
      />
      <ModalDeReserva panel={panel} onOpenChange={alCambiarModal} onGuardado={alGuardar} />
    </div>
  );
}
