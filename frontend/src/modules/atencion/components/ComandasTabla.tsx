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
  onCerrar: (id: number) => void;
  onEntregas: (id: number) => void;
  onModificar: (id: number) => void;
  onReabrir: (id: number) => void;
  onAnular: (id: number) => void;
  onFacturar: (id: number) => void;
  onPagina: (offset: number) => void;
}

export function ComandasTabla({
  pagina,
  mozos,
  hayFiltros,
  ocupado,
  onCerrar,
  onEntregas,
  onModificar,
  onReabrir,
  onAnular,
  onFacturar,
  onPagina,
}: Props) {
  return (
    <section aria-label="Listado de comandas" className="space-y-4">
      {pagina.items.length === 0 ? (
        <ComandasVacias pagina={pagina} hayFiltros={hayFiltros} />
      ) : (
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
          <ComandasFilas
            pagina={pagina}
            mozos={mozos}
            acciones={{
              onCerrar,
              onEntregas,
              onModificar,
              onReabrir,
              onAnular,
              onFacturar,
              ocupado,
            }}
          />
        </Table>
      )}
      <PaginacionComandas pagina={pagina} ocupado={ocupado} onPagina={onPagina} />
    </section>
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
  onCerrar: (id: number) => void;
  onEntregas: (id: number) => void;
  onModificar: (id: number) => void;
  onReabrir: (id: number) => void;
  onAnular: (id: number) => void;
  onFacturar: (id: number) => void;
}

function ComandasFilas({
  pagina,
  mozos,
  acciones,
}: {
  pagina: Pagina<ComandaResumen>;
  mozos: MozoSeleccionable[];
  acciones: Omit<AccionesProps, 'comanda'>;
}) {
  return (
    <TableBody>
      {pagina.items.map((comanda) => (
        <ComandaFila key={comanda.id} comanda={comanda} mozos={mozos} {...acciones} />
      ))}
    </TableBody>
  );
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

function AccionesComanda({ comanda, ocupado, ...acciones }: AccionesProps) {
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
        <Button
          variant="danger"
          disabled={ocupado}
          aria-label={`Anular comanda #${comanda.id}`}
          onClick={() => acciones.onAnular(comanda.id)}
        >
          Anular comanda
        </Button>
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
      {comanda.estado === 'CERRADA' && (
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
