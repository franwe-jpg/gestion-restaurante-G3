import type { ReactNode } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import type { MenuEjecutivo } from '../types';

import { MenuEjecutivosTabla } from './MenuEjecutivosTabla';

interface ListadoMenuEjecutivosProps {
  menus: MenuEjecutivo[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onCambiarPagina: (pagina: number) => void;
  onEditar?: (menu: MenuEjecutivo) => void;
  onDadoDeBaja?: () => void;
  /** Barra de filtros y acciones que la guía ubica arriba de la tabla. */
  toolbar?: ReactNode;
}

export function ListadoMenuEjecutivos({
  menus,
  pagina,
  limite,
  total,
  totalPaginas,
  cargando,
  error,
  onReintentar,
  onCambiarPagina,
  onEditar,
  onDadoDeBaja,
  toolbar,
}: ListadoMenuEjecutivosProps) {
  const desde = (pagina - 1) * limite + 1;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {toolbar}

        <MenuEjecutivosTabla
          menus={menus}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          onEditar={onEditar}
          onDadoDeBaja={onDadoDeBaja}
        />

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PaginationSummary
              desde={desde}
              hasta={Math.min((pagina - 1) * limite + menus.length, total)}
              total={total}
              etiqueta="menús ejecutivos"
              etiquetaSingular="menú ejecutivo"
            />
            {totalPaginas > 1 && (
              <Pagination
                pagina={pagina}
                totalPaginas={totalPaginas}
                onCambiarPagina={onCambiarPagina}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
