import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import type { Promocion } from '../types';

import { PromocionesTabla } from './PromocionesTabla';

interface ListadoPromocionesProps {
  promociones: Promocion[];
  pagina: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onCambiarPagina: (pagina: number) => void;
  onEditar?: (promocion: Promocion) => void;
  onFinalizada?: () => void;
}

export function ListadoPromociones({
  promociones,
  pagina,
  totalPaginas,
  cargando,
  error,
  onReintentar,
  onCambiarPagina,
  onEditar,
  onFinalizada,
}: ListadoPromocionesProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <PromocionesTabla
          promociones={promociones}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          onEditar={onEditar}
          onFinalizada={onFinalizada}
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
