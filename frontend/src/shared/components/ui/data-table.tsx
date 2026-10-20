import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import { EmptyState } from '../EmptyState';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export interface ColumnaTabla<T> {
  clave: string;
  encabezado: ReactNode;
  render: (fila: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  obtenerClave: (fila: T) => string | number;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  vacio?: ReactNode;
  cantidadFilasCargando?: number;
}

export function DataTable<T>({
  columnas,
  filas,
  obtenerClave,
  cargando = false,
  error = null,
  onReintentar,
  vacio,
  cantidadFilasCargando = 4,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState descripcion={error} onReintentar={onReintentar} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columnas.map((columna) => (
            <TableHead key={columna.clave} className={columna.className}>
              {columna.encabezado}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {cargando &&
          Array.from({ length: cantidadFilasCargando }, (_, indiceFila) => (
            <TableRow key={`cargando-${indiceFila}`}>
              {columnas.map((columna) => (
                <TableCell key={columna.clave}>
                  <Skeleton className="h-4 w-full max-w-32" />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {!cargando &&
          filas.map((fila) => (
            <TableRow key={obtenerClave(fila)}>
              {columnas.map((columna) => (
                <TableCell key={columna.clave} className={columna.className}>
                  {columna.render(fila)}
                </TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>

      {!cargando && filas.length === 0 && (
        <tfoot>
          <tr>
            <td colSpan={columnas.length}>
              {vacio ?? (
                <EmptyState
                  icono={Inbox}
                  titulo="Sin resultados"
                  descripcion="No hay registros para mostrar con los filtros actuales."
                />
              )}
            </td>
          </tr>
        </tfoot>
      )}
    </Table>
  );
}
