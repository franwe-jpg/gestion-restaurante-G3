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
import type { ComandaResumen } from '../types';

interface Props {
  pagina: Pagina<ComandaResumen>;
  hayFiltros: boolean;
  ocupado: boolean;
  onCerrar: (id: number) => void;
  onPagina: (offset: number) => void;
}

export function ComandasTabla({ pagina, hayFiltros, ocupado, onCerrar, onPagina }: Props) {
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
              <TableHead>Estado</TableHead>
              <TableHead>Fecha local</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagina.items.map((comanda) => (
              <ComandaFila
                key={comanda.id}
                comanda={comanda}
                ocupado={ocupado}
                onCerrar={onCerrar}
              />
            ))}
          </TableBody>
        </Table>
      )}
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

function ComandaFila({
  comanda,
  ocupado,
  onCerrar,
}: {
  comanda: ComandaResumen;
  ocupado: boolean;
  onCerrar: (id: number) => void;
}) {
  return (
    <TableRow>
      <TableCell>Comanda #{comanda.id}</TableCell>
      <TableCell>{comanda.mesa_id}</TableCell>
      <TableCell>{comanda.estado}</TableCell>
      <TableCell>{new Date(comanda.fecha_hora).toLocaleString()}</TableCell>
      <TableCell>
        <Button
          variant="outline"
          disabled={ocupado || comanda.estado !== 'ABIERTA'}
          aria-label={`Cerrar comanda #${comanda.id}`}
          onClick={() => onCerrar(comanda.id)}
        >
          Cerrar
        </Button>
      </TableCell>
    </TableRow>
  );
}
