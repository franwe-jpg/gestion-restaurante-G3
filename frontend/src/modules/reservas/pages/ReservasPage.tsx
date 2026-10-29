import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardDescription, CardHeader } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import {
  NavegadorFecha,
  ReservaFormulario,
  ReservasTabla,
  SelectorEstadoReserva,
} from '../components';
import { formatearFechaReserva } from '../fechas';
import type { Reserva } from '../types';

import { useListadoReservas } from './useListadoReservas';

/** El panel lateral: cerrado, para una reserva nueva o para modificar la fila elegida. */
type Panel = 'cerrado' | 'alta' | { edicion: Reserva };

interface ListadoDelDiaProps {
  listado: ReturnType<typeof useListadoReservas>;
  onModificar: (reserva: Reserva) => void;
}

/** Navegador de fecha, filtro de estado, tabla del día y paginación. */
function ListadoDelDia({ listado, onModificar }: ListadoDelDiaProps) {
  const { fecha, estado, paginacion, reservas } = listado;
  return (
    <div className="min-w-0 flex-1 space-y-4">
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
          onModificar={onModificar}
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

interface PanelDeReservaProps {
  panel: Panel;
  onCerrar: () => void;
  onGuardado: () => void;
}

function PanelDeReserva({ panel, onCerrar, onGuardado }: PanelDeReservaProps) {
  if (panel === 'cerrado') return null;
  const reserva = panel === 'alta' ? undefined : panel.edicion;
  return (
    <div className="w-full lg:w-96 lg:shrink-0">
      {/* La clave reinicia el formulario al pasar de una fila a otra o de la edición al alta. */}
      <ReservaFormulario
        key={reserva?.id ?? 'alta'}
        reserva={reserva}
        onCerrar={onCerrar}
        onGuardado={onGuardado}
      />
    </div>
  );
}

export function ReservasPage() {
  const listado = useListadoReservas();
  const [panel, setPanel] = useState<Panel>('cerrado');

  const alGuardar = () => {
    setPanel('cerrado');
    listado.reservas.recargar();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reservas"
        descripcion="Libro de reservas, turnos de almuerzo/cena y confirmación de comensales."
        acciones={
          <Button onClick={() => setPanel('alta')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva reserva
          </Button>
        }
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <ListadoDelDia
          listado={listado}
          onModificar={(reserva) => setPanel({ edicion: reserva })}
        />
        <PanelDeReserva panel={panel} onCerrar={() => setPanel('cerrado')} onGuardado={alGuardar} />
      </div>
    </div>
  );
}
