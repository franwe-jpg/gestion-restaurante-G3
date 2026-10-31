import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Pagination } from '../../../shared/components/ui/pagination';

import { MedioPagoFormDialog } from '../components/MedioPagoFormDialog';
import { MediosPagoTabla } from '../components/MediosPagoTabla';
import { useBajaMedioPago } from '../components/useBajaMedioPago';
import { useMediosPagoDelModulo } from '../components/useMediosPagoDelModulo';
import type { MedioPago } from '../types';

const SIN_HABILITADOS = 'No hay medios de pago disponibles para cobrar.';
const SIN_MEDIOS = 'No hay medios de pago cargados.';

function useDialogoMedioPago(recargar: () => void) {
  const [abierto, setAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<MedioPago | null>(null);

  const abrir = (medioPago: MedioPago | null = null) => {
    setEnEdicion(medioPago);
    setAbierto(true);
  };
  const alGuardar = () => {
    setAbierto(false);
    recargar();
  };

  return { abierto, enEdicion, setAbierto, abrir, alGuardar };
}

interface ListadoMediosPagoProps {
  listado: ReturnType<typeof useMediosPagoDelModulo>;
  incluirDeshabilitados: boolean;
  onCambiarIncluirDeshabilitados: (incluir: boolean) => void;
  onEditar: (medioPago: MedioPago) => void;
}

/** HU-M6-07: casilla de deshabilitados, tabla y paginación. */
function ListadoMediosPago({
  listado,
  incluirDeshabilitados,
  onCambiarIncluirDeshabilitados,
  onEditar,
}: ListadoMediosPagoProps) {
  const { mediosPago, cargando, error, recargar, paginacion } = listado;
  const { eliminar } = useBajaMedioPago({ onEliminado: recargar });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            checked={incluirDeshabilitados}
            onChange={(evento) => onCambiarIncluirDeshabilitados(evento.target.checked)}
          />
          Mostrar deshabilitados
        </label>
        <MediosPagoTabla
          mediosPago={mediosPago}
          mensajeVacio={incluirDeshabilitados ? SIN_MEDIOS : SIN_HABILITADOS}
          cargando={cargando}
          error={error}
          onReintentar={recargar}
          onEditar={onEditar}
          onEliminar={(medioPago) => void eliminar(medioPago)}
        />
        {paginacion.totalPaginas > 1 && (
          <Pagination
            pagina={paginacion.pagina}
            totalPaginas={paginacion.totalPaginas}
            onCambiarPagina={paginacion.irAPagina}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function PagosPage() {
  const [incluirDeshabilitados, setIncluirDeshabilitados] = useState(false);
  const listado = useMediosPagoDelModulo(incluirDeshabilitados);
  const dialogo = useDialogoMedioPago(listado.recargar);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Pagos"
        descripcion="Formas de cobro que acepta el local."
        acciones={
          <Button onClick={() => dialogo.abrir()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo medio de pago
          </Button>
        }
      />
      <ListadoMediosPago
        listado={listado}
        incluirDeshabilitados={incluirDeshabilitados}
        onCambiarIncluirDeshabilitados={setIncluirDeshabilitados}
        onEditar={(medioPago) => dialogo.abrir(medioPago)}
      />
      {dialogo.abierto && (
        <MedioPagoFormDialog
          medioPago={dialogo.enEdicion}
          onGuardado={dialogo.alGuardar}
          onOpenChange={dialogo.setAbierto}
        />
      )}
    </div>
  );
}
