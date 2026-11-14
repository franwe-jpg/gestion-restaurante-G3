import type { Pagina } from '../../../shared/types';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import type { EstadoConsulta } from '../../../shared/hooks/useApi';
import type { FiltroEstado, MenuDelDiaListado } from '../types';

import { FiltroEstadoMenuDelDia } from './FiltroEstadoMenuDelDia';
import { MenuDelDiaTabla } from './MenuDelDiaTabla';

export interface MenuDelDiaListaProps {
  menus: EstadoConsulta<Pagina<MenuDelDiaListado>>;
  pagina: number;
  limite: number;
  onPagina: (pagina: number) => void;
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  /** Sin `onNuevo` (rol sin permiso de gestion) no se muestra el botón de alta. */
  onNuevo?: () => void;
  onEditar?: (menu: MenuDelDiaListado) => void;
  onDarDeBaja?: (menu: MenuDelDiaListado) => void;
}

interface BarraDelListadoProps {
  items: MenuDelDiaListado[];
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  onNuevo?: () => void;
}

/** Filtro por estado y acciones del listado: exportar y, con permiso, dar de alta. */
function BarraDelListado({ items, estado, onCambiarEstado, onNuevo }: BarraDelListadoProps) {
  return (
    <TableToolbar
      acciones={
        <>
          <ExportButton filas={items} nombreArchivo="menus-del-dia" />
          {onNuevo && (
            <Button variant="brand-outline" onClick={onNuevo}>
              Nuevo menú del día
            </Button>
          )}
        </>
      }
    >
      <FilterBar className="border-0 p-0">
        <div className="flex items-center gap-2">
          <label htmlFor="filtro-estado-menu-dia" className="text-sm font-medium text-slate-700">
            Estado
          </label>
          <FiltroEstadoMenuDelDia estado={estado} onCambiar={onCambiarEstado} />
        </div>
      </FilterBar>
    </TableToolbar>
  );
}

/** Tarjeta con la tabla paginada de menús del día. */
export function MenuDelDiaLista({
  menus,
  pagina,
  limite,
  onPagina,
  estado,
  onCambiarEstado,
  onNuevo,
  onEditar,
  onDarDeBaja,
}: MenuDelDiaListaProps) {
  const items = menus.datos?.items ?? [];
  const total = menus.datos?.total ?? 0;
  const totalPaginas = Math.ceil(total / limite);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <BarraDelListado
          items={items}
          estado={estado}
          onCambiarEstado={onCambiarEstado}
          onNuevo={onNuevo}
        />

        <MenuDelDiaTabla
          menus={items}
          cargando={menus.cargando}
          error={menus.error}
          onReintentar={menus.recargar}
          onEditar={onEditar}
          onDarDeBaja={onDarDeBaja}
        />

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PaginationSummary
              desde={(pagina - 1) * limite + 1}
              hasta={Math.min((pagina - 1) * limite + items.length, total)}
              total={total}
              etiqueta="menús del día"
              etiquetaSingular="menú del día"
            />
            {totalPaginas > 1 && (
              <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onPagina} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
