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

import { useListadoReservas } from './useListadoReservas';

type Panel = 'cerrado' | 'alta';

/** Navegador de fecha, filtro de estado, tabla del día y paginación. */
function ListadoDelDia({ listado }: { listado: ReturnType<typeof useListadoReservas> }) {
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
        <ListadoDelDia listado={listado} />
        {panel === 'alta' && (
          <div className="w-full lg:w-96 lg:shrink-0">
            <ReservaFormulario onCerrar={() => setPanel('cerrado')} onGuardado={alGuardar} />
          </div>
        )}
      </div>
    </div>
  );
}
