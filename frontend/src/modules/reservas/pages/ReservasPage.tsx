import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Pagination } from '../../../shared/components/ui/pagination';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';

import { ReservaFormDialog } from '../components/ReservaFormDialog';
import { ReservasTabla } from '../components/ReservasTabla';
import { useReservasDelDia } from '../components/useReservasDelDia';
import type { Reserva } from '../types';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function SelectorFecha({
  fecha,
  onCambiar,
}: {
  fecha: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="reservas-fecha-filtro">Día</Label>
      <Input
        id="reservas-fecha-filtro"
        type="date"
        value={fecha}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
    </div>
  );
}

/** Estado del diálogo de alta o edición y sus acciones; separado para que la página quede corta. */
function useDialogoDeReserva(recargarEdicion: () => void, avisarAlta: () => void) {
  const [abierto, setAbierto] = useState(false);
  const [reservaEnEdicion, setReservaEnEdicion] = useState<Reserva | null>(null);

  const abrirAlta = () => {
    setReservaEnEdicion(null);
    setAbierto(true);
  };

  const abrirEdicion = (reserva: Reserva) => {
    setReservaEnEdicion(reserva);
    setAbierto(true);
  };

  const alGuardar = () => {
    setAbierto(false);
    const eraEdicion = reservaEnEdicion !== null;
    setReservaEnEdicion(null);
    if (eraEdicion) recargarEdicion();
    else avisarAlta();
  };

  return { abierto, setAbierto, reservaEnEdicion, abrirAlta, abrirEdicion, alGuardar };
}

export function ReservasPage() {
  const [fecha, setFecha] = useState(hoy());
  const [refresco, setRefresco] = useState(0);
  const { reservas, cargando, error, recargar, paginacion } = useReservasDelDia(fecha, refresco);
  const dialogo = useDialogoDeReserva(recargar, () => setRefresco((previa) => previa + 1));

  const cambiarFecha = (valor: string) => {
    setFecha(valor);
    paginacion.irAPagina(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reservas"
        descripcion="Libro de reservas y asignación de mesas por fecha y horario."
        acciones={
          <Button onClick={dialogo.abrirAlta}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva reserva
          </Button>
        }
      />

      <TableToolbar>
        <SelectorFecha fecha={fecha} onCambiar={cambiarFecha} />
      </TableToolbar>

      <ReservasTabla
        reservas={reservas}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={dialogo.abrirEdicion}
      />

      {paginacion.totalPaginas > 1 && (
        <Pagination
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          onCambiarPagina={paginacion.irAPagina}
        />
      )}

      {dialogo.abierto && (
        <ReservaFormDialog
          reserva={dialogo.reservaEnEdicion}
          onGuardado={dialogo.alGuardar}
          onOpenChange={dialogo.setAbierto}
        />
      )}
    </div>
  );
}
