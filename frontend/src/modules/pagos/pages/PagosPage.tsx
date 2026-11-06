import { Plus, Receipt } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Pagination } from '../../../shared/components/ui/pagination';
import { Tabs } from '../../../shared/components/ui/tabs';

import { FacturarComandaDialog } from '../components/FacturarComandaDialog';
import { FacturasPanel } from '../components/FacturasPanel';
import { MedioPagoFormDialog } from '../components/MedioPagoFormDialog';
import { MediosPagoTabla } from '../components/MediosPagoTabla';
import { useBajaMedioPago } from '../components/useBajaMedioPago';
import { useMediosPagoDelModulo } from '../components/useMediosPagoDelModulo';
import type { MedioPago } from '../types';

const SIN_HABILITADOS = 'No hay medios de pago disponibles para cobrar.';
const SIN_MEDIOS = 'No hay medios de pago cargados.';
const DESCRIPCIONES: Record<string, string> = {
  medios: 'Formas de cobro que acepta el local.',
  facturas: 'Facturas emitidas y saldo pendiente.',
};

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

interface EncabezadoDePagosProps {
  pestana: string;
  onFacturar: () => void;
  onNuevoMedioPago: () => void;
}

function EncabezadoDePagos({ pestana, onFacturar, onNuevoMedioPago }: EncabezadoDePagosProps) {
  return (
    <PageHeader
      titulo="Pagos"
      descripcion={DESCRIPCIONES[pestana] ?? DESCRIPCIONES.medios}
      acciones={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onFacturar}>
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Facturar comanda
          </Button>
          {pestana === 'medios' && (
            <Button onClick={onNuevoMedioPago}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo medio de pago
            </Button>
          )}
        </div>
      }
    />
  );
}

interface PestanasDePagosProps {
  pestana: string;
  onCambiarPestana: (id: string) => void;
  listado: ReturnType<typeof useMediosPagoDelModulo>;
  incluirDeshabilitados: boolean;
  onCambiarIncluirDeshabilitados: (incluir: boolean) => void;
  onEditarMedioPago: (medioPago: MedioPago) => void;
  refrescoFacturas: number;
}

function PestanasDePagos({
  pestana,
  onCambiarPestana,
  listado,
  incluirDeshabilitados,
  onCambiarIncluirDeshabilitados,
  onEditarMedioPago,
  refrescoFacturas,
}: PestanasDePagosProps) {
  return (
    <Tabs
      valor={pestana}
      onCambiar={onCambiarPestana}
      items={[
        {
          id: 'medios',
          etiqueta: 'Medios de pago',
          contenido: (
            <ListadoMediosPago
              listado={listado}
              incluirDeshabilitados={incluirDeshabilitados}
              onCambiarIncluirDeshabilitados={onCambiarIncluirDeshabilitados}
              onEditar={onEditarMedioPago}
            />
          ),
        },
        {
          id: 'facturas',
          etiqueta: 'Facturas',
          contenido: <FacturasPanel key={refrescoFacturas} />,
        },
      ]}
    />
  );
}

export function PagosPage() {
  const [pestana, setPestana] = useState('medios');
  const [facturando, setFacturando] = useState(false);
  const [refrescoFacturas, setRefrescoFacturas] = useState(0);
  const [incluirDeshabilitados, setIncluirDeshabilitados] = useState(false);
  const listado = useMediosPagoDelModulo(incluirDeshabilitados);
  const dialogo = useDialogoMedioPago(listado.recargar);

  return (
    <div className="space-y-6">
      <EncabezadoDePagos
        pestana={pestana}
        onFacturar={() => setFacturando(true)}
        onNuevoMedioPago={() => dialogo.abrir()}
      />
      <PestanasDePagos
        pestana={pestana}
        onCambiarPestana={setPestana}
        listado={listado}
        incluirDeshabilitados={incluirDeshabilitados}
        onCambiarIncluirDeshabilitados={setIncluirDeshabilitados}
        onEditarMedioPago={(medioPago) => dialogo.abrir(medioPago)}
        refrescoFacturas={refrescoFacturas}
      />
      {facturando && (
        <FacturarComandaDialog
          onGenerada={() => {
            setFacturando(false);
            setRefrescoFacturas((anterior) => anterior + 1);
          }}
          onOpenChange={setFacturando}
        />
      )}
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
