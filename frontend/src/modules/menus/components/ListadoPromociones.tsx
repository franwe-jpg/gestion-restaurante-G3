import type { ReactNode } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import type { Promocion } from '../types';

import { PromocionesTabla } from './PromocionesTabla';

interface ListadoPromocionesProps {
  promociones: Promocion[];
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onCambiarPagina: (pagina: number) => void;
  onEditar?: (promocion: Promocion) => void;
  onFinalizada?: () => void;
  /** Barra de filtros y acciones que la guía ubica arriba de la tabla. */
  toolbar?: ReactNode;
}

export function ListadoPromociones({
  promociones,
  pagina,
  limite,
  total,
  totalPaginas,
  cargando,
  error,
  onReintentar,
  onCambiarPagina,
  onEditar,
  onFinalizada,
  toolbar,
}: ListadoPromocionesProps) {
  const desde = (pagina - 1) * limite + 1;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {toolbar}

        <PromocionesTabla
          promociones={promociones}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          onEditar={onEditar}
          onFinalizada={onFinalizada}
        />

        {total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PaginationSummary
              desde={desde}
              hasta={Math.min((pagina - 1) * limite + promociones.length, total)}
              total={total}
              etiqueta="promociones"
              etiquetaSingular="promoción"
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
