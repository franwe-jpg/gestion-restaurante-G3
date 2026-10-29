import type { Pagina } from '../../../shared/types';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
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
  onEditar: (menu: MenuDelDiaListado) => void;
  onDarDeBaja: (menu: MenuDelDiaListado) => void;
}

/** Tarjeta con la tabla paginada de menús del día. */
export function MenuDelDiaLista({
  menus,
  pagina,
  limite,
  onPagina,
  estado,
  onCambiarEstado,
  onEditar,
  onDarDeBaja,
}: MenuDelDiaListaProps) {
  const total = menus.datos?.total ?? 0;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <FiltroEstadoMenuDelDia estado={estado} onCambiar={onCambiarEstado} />
        <MenuDelDiaTabla
          menus={menus.datos?.items ?? []}
          cargando={menus.cargando}
          error={menus.error}
          onReintentar={menus.recargar}
          onEditar={onEditar}
          onDarDeBaja={onDarDeBaja}
        />
        <PaginacionMenuDelDia {...{ total, limite, pagina, onPagina }} />
      </CardContent>
    </Card>
  );
}

function PaginacionMenuDelDia({
  total,
  limite,
  pagina,
  onPagina,
}: {
  total: number;
  limite: number;
  pagina: number;
  onPagina: (pagina: number) => void;
}) {
  if (total <= limite) return null;
  return (
    <Pagination
      pagina={pagina}
      totalPaginas={Math.ceil(total / limite)}
      onCambiarPagina={onPagina}
    />
  );
}
