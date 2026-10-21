import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from './button';

type ElementoPaginador = number | 'separador';

export interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  onCambiarPagina: (pagina: number) => void;
  className?: string;
}

function paginasVisibles(pagina: number, totalPaginas: number): ElementoPaginador[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  }

  const elementos: ElementoPaginador[] = [1];
  const desde = Math.max(2, Math.min(pagina - 1, totalPaginas - 4));
  const hasta = Math.min(totalPaginas - 1, Math.max(pagina + 1, 4));

  if (desde > 2) elementos.push('separador');
  for (let numero = desde; numero <= hasta; numero += 1) {
    elementos.push(numero);
  }
  if (hasta < totalPaginas - 1) elementos.push('separador');

  elementos.push(totalPaginas);
  return elementos;
}

export function Pagination({ pagina, totalPaginas, onCambiarPagina, className }: PaginationProps) {
  const elementos = paginasVisibles(pagina, totalPaginas);

  return (
    <nav
      aria-label="Paginación"
      className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}
    >
      <p className="text-sm text-slate-500">
        Página {pagina} de {totalPaginas}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCambiarPagina(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {elementos.map((elemento, indice) =>
          elemento === 'separador' ? (
            <span
              key={`separador-${indice}`}
              className="flex h-8 w-8 items-center justify-center text-slate-400"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={elemento}
              variant={elemento === pagina ? 'default' : 'ghost'}
              size="sm"
              className="min-w-8 px-2"
              onClick={() => onCambiarPagina(elemento)}
              aria-label={`Página ${elemento}`}
              aria-current={elemento === pagina ? 'page' : undefined}
            >
              {elemento}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onCambiarPagina(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
