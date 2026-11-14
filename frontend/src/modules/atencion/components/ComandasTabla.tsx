import {
  Ban,
  CheckCircle2,
  ClipboardList,
  FilterX,
  Pencil,
  Receipt,
  RotateCcw,
  UserRoundCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import { formatearFecha, formatearHora } from '../../../shared/lib/format';
import type { Pagina } from '../../../shared/types';
import type { ComandaResumen, MozoSeleccionable } from '../types';
import { nombreDeMozo } from './catalogoComanda';

interface Props {
  pagina: Pagina<ComandaResumen>;
  mozos: MozoSeleccionable[];
  hayFiltros: boolean;
  ocupado: boolean;
  /** Sin `COMANDAS_OPERAR` la fila solo permite ver el detalle. */
  puedeOperar: boolean;
  /** Sin `PAGOS_OPERAR` no se ofrece «Facturar». */
  puedeFacturar: boolean;
  onCerrar: (id: number) => void;
  onEntregas: (id: number) => void;
  onModificar: (id: number) => void;
  onReabrir: (id: number) => void;
  onAnular: (id: number) => void;
  onFacturar: (id: number) => void;
  /** S4-04: el backend acepta el cambio de mozo en cualquier estado de la comanda. */
  onCambiarMozo: (id: number, mozoActual: MozoSeleccionable | null) => void;
  onPagina: (offset: number) => void;
}

type AccionesDeFila = Omit<Props, 'pagina' | 'hayFiltros' | 'onPagina' | 'mozos'>;

function columnasDeComandas(
  mozos: MozoSeleccionable[],
  acciones: AccionesDeFila,
): ColumnaTabla<ComandaResumen>[] {
  return [
    {
      clave: 'comanda',
      encabezado: 'Comanda',
      render: (comanda) => `Comanda #${comanda.id}`,
    },
    {
      clave: 'mesa',
      encabezado: 'Mesa',
      render: (comanda) => comanda.mesa_id,
    },
    {
      clave: 'mozo',
      encabezado: 'Mozo',
      render: (comanda) => nombreDeMozo(mozos, comanda.mozo_id),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (comanda) => <StatusBadge estado={comanda.estado} />,
    },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      className: 'whitespace-nowrap',
      render: (comanda) => formatearFecha(comanda.fecha_hora),
    },
    {
      clave: 'hora',
      encabezado: 'Hora',
      className: 'whitespace-nowrap',
      render: (comanda) => formatearHora(comanda.fecha_hora),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (comanda) => {
        const mozoActual = mozos.find((mozo) => mozo.id === comanda.mozo_id) ?? null;
        return <AccionesComanda comanda={comanda} mozoActual={mozoActual} {...acciones} />;
      },
    },
  ];
}

function PieDeComandas({
  pagina,
  onPagina,
}: {
  pagina: Pagina<ComandaResumen>;
  onPagina: (offset: number) => void;
}) {
  const totalPaginas = Math.ceil(pagina.total / pagina.limit);
  const numeroPagina = Math.floor(pagina.offset / pagina.limit) + 1;
  if (pagina.total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={pagina.offset + 1}
        hasta={Math.min(pagina.offset + pagina.items.length, pagina.total)}
        total={pagina.total}
        etiqueta="comandas"
      />
      {totalPaginas > 1 && (
        <Pagination
          pagina={numeroPagina}
          totalPaginas={totalPaginas}
          onCambiarPagina={(numero) => onPagina((numero - 1) * pagina.limit)}
        />
      )}
    </div>
  );
}

export function ComandasTabla({ pagina, hayFiltros, onPagina, ...fila }: Props) {
  const { mozos, ...acciones } = fila;
  return (
    <section aria-label="Listado de comandas" className="space-y-4">
      <DataTable
        columnas={columnasDeComandas(mozos, acciones)}
        filas={pagina.items}
        obtenerClave={(comanda) => comanda.id}
        vacio={<ComandasVacias pagina={pagina} hayFiltros={hayFiltros} />}
      />
      <PieDeComandas pagina={pagina} onPagina={onPagina} />
    </section>
  );
}

function ComandasVacias({
  pagina,
  hayFiltros,
}: {
  pagina: Pagina<ComandaResumen>;
  hayFiltros: boolean;
}) {
  const sinRegistros = pagina.total === 0 && !hayFiltros;
  const titulo = sinRegistros
    ? 'No hay comandas registradas'
    : hayFiltros
      ? 'Sin coincidencias'
      : 'Página sin comandas';
  const descripcion = sinRegistros
    ? 'Las comandas registradas van a aparecer en este listado.'
    : hayFiltros
      ? 'No hay comandas que coincidan con los filtros seleccionados.'
      : 'No hay comandas en esta página; el total indica que existen en otras páginas.';
  return (
    <EmptyState
      icono={hayFiltros ? FilterX : ClipboardList}
      titulo={titulo}
      descripcion={descripcion}
    />
  );
}

interface AccionesProps {
  comanda: ComandaResumen;
  ocupado: boolean;
  puedeOperar: boolean;
  puedeFacturar: boolean;
  onCerrar: (id: number) => void;
  onEntregas: (id: number) => void;
  onModificar: (id: number) => void;
  onReabrir: (id: number) => void;
  onAnular: (id: number) => void;
  onFacturar: (id: number) => void;
  onCambiarMozo: (id: number, mozoActual: MozoSeleccionable | null) => void;
  mozoActual: MozoSeleccionable | null;
}

interface BotonIconoProps {
  etiqueta: string;
  title: string;
  icono: LucideIcon;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}

/** Acción secundaria: solo el icono, con `title` al pasar el mouse y `aria-label` para lectores. */
function BotonIcono({
  etiqueta,
  title,
  icono: Icono,
  className = 'px-2',
  disabled = false,
  onClick,
}: BotonIconoProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      disabled={disabled}
      aria-label={etiqueta}
      title={title}
      onClick={onClick}
    >
      <Icono className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function BotonEntregas({ id, onEntregas }: { id: number; onEntregas: (id: number) => void }) {
  return (
    <Button
      variant="brand-outline"
      size="sm"
      aria-label={`Entregas de la comanda #${id}`}
      title="Entregas"
      onClick={() => onEntregas(id)}
    >
      Entregas
    </Button>
  );
}

function BotonCambiarMozo({
  comanda,
  mozoActual,
  ocupado,
  onCambiarMozo,
}: Pick<AccionesProps, 'comanda' | 'mozoActual' | 'ocupado' | 'onCambiarMozo'>) {
  return (
    <BotonIcono
      etiqueta={`Cambiar mozo de la comanda #${comanda.id}`}
      title="Cambiar mozo"
      icono={UserRoundCog}
      disabled={ocupado}
      onClick={() => onCambiarMozo(comanda.id, mozoActual)}
    />
  );
}

function AccionesComanda({ puedeOperar, ...props }: AccionesProps) {
  if (!puedeOperar) {
    return (
      <Button
        variant="brand-outline"
        size="sm"
        aria-label={`Ver detalle de la comanda #${props.comanda.id}`}
        onClick={() => props.onEntregas(props.comanda.id)}
      >
        Ver detalle
      </Button>
    );
  }
  return <AccionesDeOperacion {...props} />;
}

type AccionesDeOperacionProps = Omit<AccionesProps, 'puedeOperar'>;

function AccionesSecundarias({
  props,
  abierta,
  cerrada,
}: {
  props: AccionesDeOperacionProps;
  abierta: boolean;
  cerrada: boolean;
}) {
  const { comanda, ocupado, onModificar, onReabrir, onCerrar } = props;
  return (
    <>
      <BotonIcono
        etiqueta={`Modificar comanda #${comanda.id}`}
        title="Modificar"
        icono={Pencil}
        disabled={ocupado || !abierta}
        onClick={() => onModificar(comanda.id)}
      />
      <BotonCambiarMozo
        comanda={comanda}
        mozoActual={props.mozoActual}
        ocupado={ocupado}
        onCambiarMozo={props.onCambiarMozo}
      />
      <BotonIcono
        etiqueta={`Reabrir comanda #${comanda.id}`}
        title="Reabrir"
        icono={RotateCcw}
        disabled={ocupado || !cerrada}
        onClick={() => onReabrir(comanda.id)}
      />
      <BotonIcono
        etiqueta={`Cerrar comanda #${comanda.id}`}
        title="Cerrar"
        icono={CheckCircle2}
        disabled={ocupado || !abierta}
        onClick={() => onCerrar(comanda.id)}
      />
    </>
  );
}

function AccionesDeOperacion(props: AccionesDeOperacionProps) {
  const { comanda, ocupado, puedeFacturar, onAnular, onEntregas, onFacturar } = props;
  const abierta = comanda.estado === 'ABIERTA';
  const cerrada = comanda.estado === 'CERRADA';
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      <BotonEntregas id={comanda.id} onEntregas={onEntregas} />
      {abierta && (
        <BotonIcono
          etiqueta={`Anular comanda #${comanda.id}`}
          title="Anular comanda"
          icono={Ban}
          className="px-2 text-danger-strong hover:bg-danger-subtle"
          disabled={ocupado}
          onClick={() => onAnular(comanda.id)}
        />
      )}
      <AccionesSecundarias props={props} abierta={abierta} cerrada={cerrada} />
      {cerrada && puedeFacturar && (
        <BotonIcono
          etiqueta={`Facturar comanda #${comanda.id}`}
          title="Facturar"
          icono={Receipt}
          disabled={ocupado}
          onClick={() => onFacturar(comanda.id)}
        />
      )}
    </div>
  );
}
