import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import type { MenuEjecutivo } from '../types';

import { MenuEjecutivosTabla } from './MenuEjecutivosTabla';

interface ListadoMenuEjecutivosProps {
  menus: MenuEjecutivo[];
  pagina: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onCambiarPagina: (pagina: number) => void;
}

export function ListadoMenuEjecutivos({
  menus,
  pagina,
  totalPaginas,
  cargando,
  error,
  onReintentar,
  onCambiarPagina,
}: ListadoMenuEjecutivosProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <MenuEjecutivosTabla
          menus={menus}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
        />
        {totalPaginas > 1 && (
          <Pagination
            className="mt-5"
            pagina={pagina}
            totalPaginas={totalPaginas}
            onCambiarPagina={onCambiarPagina}
          />
        )}
      </CardContent>
    </Card>
  );
}
