import type { Pagina } from '../../../shared/types';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import type { EstadoConsulta } from '../../../shared/hooks/useApi';
import type { MenuDelDiaListado } from '../types';

import { MenuDelDiaTabla } from './MenuDelDiaTabla';

export interface MenuDelDiaListaProps {
  menus: EstadoConsulta<Pagina<MenuDelDiaListado>>;
  pagina: number;
  limite: number;
  onPagina: (pagina: number) => void;
  onEditar: (menu: MenuDelDiaListado) => void;
  onDarDeBaja: (menu: MenuDelDiaListado) => void;
}

/** Tarjeta con la tabla paginada de menús del día. */
export function MenuDelDiaLista({
  menus,
  pagina,
  limite,
  onPagina,
  onEditar,
  onDarDeBaja,
}: MenuDelDiaListaProps) {
  const total = menus.datos?.total ?? 0;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <MenuDelDiaTabla
          menus={menus.datos?.items ?? []}
          cargando={menus.cargando}
          error={menus.error}
          onReintentar={menus.recargar}
          onEditar={onEditar}
          onDarDeBaja={onDarDeBaja}
        />
        {total > limite && (
          <Pagination
            pagina={pagina}
            totalPaginas={Math.ceil(total / limite)}
            onCambiarPagina={onPagina}
          />
        )}
      </CardContent>
    </Card>
  );
}
