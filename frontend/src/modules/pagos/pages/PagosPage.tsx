import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSesion } from '../../../shared/auth/useSesion';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';

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
  /** Sin `PAGOS_GESTIONAR` el listado es de solo lectura. */
  onEditar?: (medioPago: MedioPago) => void;
}

interface PieDelListadoProps {
  paginacion: EstadoPaginacion;
  cantidadFilas: number;
}

/** Resumen del tramo visible y paginador; no se muestra si el listado está vacío. */
function PieDelListado({ paginacion, cantidadFilas }: PieDelListadoProps) {
  if (paginacion.total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={paginacion.offset + 1}
        hasta={Math.min(paginacion.offset + cantidadFilas, paginacion.total)}
        total={paginacion.total}
        etiqueta="medios de pago"
        etiquetaSingular="medio de pago"
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
        <TableToolbar acciones={<ExportButton filas={mediosPago} nombreArchivo="medios-de-pago" />}>
          <FilterBar className="border-0 p-0">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={incluirDeshabilitados}
                onChange={(evento) => onCambiarIncluirDeshabilitados(evento.target.checked)}
              />
              Mostrar deshabilitados
            </label>
          </FilterBar>
        </TableToolbar>
        <MediosPagoTabla
          mediosPago={mediosPago}
          mensajeVacio={incluirDeshabilitados ? SIN_MEDIOS : SIN_HABILITADOS}
          cargando={cargando}
          error={error}
          onReintentar={recargar}
          onEditar={onEditar}
          onEliminar={onEditar ? (medioPago) => void eliminar(medioPago) : undefined}
        />
        <PieDelListado paginacion={paginacion} cantidadFilas={mediosPago.length} />
      </CardContent>
    </Card>
  );
}

interface EncabezadoDePagosProps {
  pestana: string;
  onFacturar: () => void;
  /** Sin `PAGOS_GESTIONAR` no se ofrece el alta de medios de pago. */
  onNuevoMedioPago?: () => void;
}

function EncabezadoDePagos({ pestana, onFacturar, onNuevoMedioPago }: EncabezadoDePagosProps) {
  return (
    <PageHeader
      titulo="Pagos"
      descripcion={DESCRIPCIONES[pestana] ?? DESCRIPCIONES.medios}
      acciones={
        <div className="flex gap-2">
          <Button variant="brand-outline" onClick={onFacturar}>
            Facturar comanda
          </Button>
          {pestana === 'medios' && onNuevoMedioPago && (
            <Button variant="brand-outline" onClick={onNuevoMedioPago}>
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
  onEditarMedioPago?: (medioPago: MedioPago) => void;
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

/** S4-03: `/pagos?comanda=<id>` abre «Facturar»; se lee una vez y se quita de la URL. */
function useComandaDelEnlace() {
  const [parametros, setParametros] = useSearchParams();
  const [inicial] = useState(() => {
    const id = Number(parametros.get('comanda'));
    return Number.isInteger(id) && id > 0 ? String(id) : undefined;
  });
  useEffect(() => {
    if (!parametros.has('comanda')) return;
    setParametros(
      (anteriores) => {
        anteriores.delete('comanda');
        return anteriores;
      },
      { replace: true },
    );
  }, [parametros, setParametros]);
  return inicial;
}

export function PagosPage() {
  const gestiona = useSesion().puede('PAGOS_GESTIONAR');
  const enlace = useComandaDelEnlace();
  const [comandaInicial, setComandaInicial] = useState(enlace);
  const [pestana, setPestana] = useState('medios');
  const [facturando, setFacturando] = useState(enlace !== undefined);
  const [refrescoFacturas, setRefrescoFacturas] = useState(0);
  const [incluirDeshabilitados, setIncluirDeshabilitados] = useState(false);
  const listado = useMediosPagoDelModulo(incluirDeshabilitados);
  const dialogo = useDialogoMedioPago(listado.recargar);

  return (
    <div className="space-y-6">
      <EncabezadoDePagos
        pestana={pestana}
        onFacturar={() => {
          setComandaInicial(undefined);
          setFacturando(true);
        }}
        onNuevoMedioPago={gestiona ? () => dialogo.abrir() : undefined}
      />
      <PestanasDePagos
        pestana={pestana}
        onCambiarPestana={setPestana}
        listado={listado}
        incluirDeshabilitados={incluirDeshabilitados}
        onCambiarIncluirDeshabilitados={setIncluirDeshabilitados}
        onEditarMedioPago={gestiona ? (medioPago) => dialogo.abrir(medioPago) : undefined}
        refrescoFacturas={refrescoFacturas}
      />
      {facturando && (
        <FacturarComandaDialog
          onGenerada={() => {
            setFacturando(false);
            setRefrescoFacturas((anterior) => anterior + 1);
          }}
          onOpenChange={setFacturando}
          comandaInicial={comandaInicial}
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
