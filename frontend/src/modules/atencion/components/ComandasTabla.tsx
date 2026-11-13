import { ClipboardList, FilterX } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/ui/table';
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
  onPagina: (offset: number) => void;
}

type PropsDeFila = Omit<Props, 'pagina' | 'hayFiltros' | 'onPagina'>;

export function ComandasTabla({ pagina, hayFiltros, onPagina, ...fila }: Props) {
  return (
    <section aria-label="Listado de comandas" className="space-y-4">
      {pagina.items.length === 0 ? (
        <ComandasVacias pagina={pagina} hayFiltros={hayFiltros} />
      ) : (
        <TablaDeComandas pagina={pagina} {...fila} />
      )}
      <PaginacionComandas pagina={pagina} ocupado={fila.ocupado} onPagina={onPagina} />
    </section>
  );
}

function TablaDeComandas({ pagina, ...fila }: PropsDeFila & { pagina: Pagina<ComandaResumen> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Comanda</TableHead>
          <TableHead>Mesa</TableHead>
          <TableHead>Mozo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha local</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagina.items.map((comanda) => (
          <ComandaFila key={comanda.id} comanda={comanda} {...fila} />
        ))}
      </TableBody>
    </Table>
  );
}

function PaginacionComandas({
  pagina,
  ocupado,
  onPagina,
}: {
  pagina: Pagina<ComandaResumen>;
  ocupado: boolean;
  onPagina: (offset: number) => void;
}) {
  return (
    <nav aria-label="Paginación de comandas" className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={ocupado || pagina.offset === 0}
        onClick={() => onPagina(Math.max(0, pagina.offset - pagina.limit))}
      >
        Anterior
      </Button>
      <span>{pagina.total} comandas</span>
      <Button
        variant="outline"
        disabled={ocupado || pagina.offset + pagina.limit >= pagina.total}
        onClick={() => onPagina(pagina.offset + pagina.limit)}
      >
        Siguiente
      </Button>
    </nav>
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
}

function AccionFacturar({
  id,
  ocupado,
  onFacturar,
}: {
  id: number;
  ocupado: boolean;
  onFacturar: (id: number) => void;
}) {
  return (
    <Button
      variant="outline"
      disabled={ocupado}
      aria-label={`Facturar comanda #${id}`}
      onClick={() => onFacturar(id)}
    >
      Facturar
    </Button>
  );
}

function BotonAnular({
  id,
  ocupado,
  onAnular,
}: {
  id: number;
  ocupado: boolean;
  onAnular: (id: number) => void;
}) {
  return (
    <Button
      variant="danger"
      disabled={ocupado}
      aria-label={`Anular comanda #${id}`}
      onClick={() => onAnular(id)}
    >
      Anular comanda
    </Button>
  );
}

function AccionesComanda({ puedeOperar, ...props }: AccionesProps) {
  if (!puedeOperar) {
    return (
      <TableCell>
        <Button
          variant="outline"
          aria-label={`Ver detalle de la comanda #${props.comanda.id}`}
          onClick={() => props.onEntregas(props.comanda.id)}
        >
          Ver detalle
        </Button>
      </TableCell>
    );
  }
  return <AccionesDeOperacion {...props} />;
}

function AccionesDeOperacion({
  comanda,
  ocupado,
  puedeFacturar,
  ...acciones
}: Omit<AccionesProps, 'puedeOperar'>) {
  return (
    <TableCell className="space-x-2">
      <Button
        variant="outline"
        aria-label={`Entregas de la comanda #${comanda.id}`}
        onClick={() => acciones.onEntregas(comanda.id)}
      >
        Entregas
      </Button>
      {comanda.estado === 'ABIERTA' && (
        <BotonAnular id={comanda.id} ocupado={ocupado} onAnular={acciones.onAnular} />
      )}
      <Button
        variant="outline"
        disabled={ocupado || comanda.estado !== 'ABIERTA'}
        aria-label={`Modificar comanda #${comanda.id}`}
        onClick={() => acciones.onModificar(comanda.id)}
      >
        Modificar
      </Button>
      <Button
        variant="outline"
        disabled={ocupado || comanda.estado !== 'CERRADA'}
        aria-label={`Reabrir comanda #${comanda.id}`}
        onClick={() => acciones.onReabrir(comanda.id)}
      >
        Reabrir
      </Button>
      <Button
        variant="outline"
        disabled={ocupado || comanda.estado !== 'ABIERTA'}
        aria-label={`Cerrar comanda #${comanda.id}`}
        onClick={() => acciones.onCerrar(comanda.id)}
      >
        Cerrar
      </Button>
      {comanda.estado === 'CERRADA' && puedeFacturar && (
        <AccionFacturar id={comanda.id} ocupado={ocupado} onFacturar={acciones.onFacturar} />
      )}
    </TableCell>
  );
}

function ComandaFila({
  comanda,
  mozos,
  ...acciones
}: AccionesProps & { mozos: MozoSeleccionable[] }) {
  return (
    <TableRow>
      <TableCell>Comanda #{comanda.id}</TableCell>
      <TableCell>{comanda.mesa_id}</TableCell>
      <TableCell>{nombreDeMozo(mozos, comanda.mozo_id)}</TableCell>
      <TableCell>{comanda.estado}</TableCell>
      <TableCell>{new Date(comanda.fecha_hora).toLocaleString()}</TableCell>
      <AccionesComanda comanda={comanda} {...acciones} />
    </TableRow>
  );
}
