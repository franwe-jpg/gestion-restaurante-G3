import { useCallback, useState } from 'react';

export interface OpcionesPaginacion {
  total: number;
  limite?: number;
  paginaInicial?: number;
}

export interface EstadoPaginacion {
  pagina: number;
  limite: number;
  totalPaginas: number;
  offset: number;
  irAPagina: (pagina: number) => void;
  anterior: () => void;
  siguiente: () => void;
}

export function usePaginacion({
  total,
  limite = 50,
  paginaInicial = 1,
}: OpcionesPaginacion): EstadoPaginacion {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const [pagina, setPagina] = useState(() =>
    Math.min(Math.max(1, paginaInicial), Math.max(1, Math.ceil(total / limite))),
  );

  const irAPagina = useCallback(
    (nuevaPagina: number) => {
      const maximo = Math.max(1, Math.ceil(total / limite));
      setPagina(Math.min(Math.max(1, nuevaPagina), maximo));
    },
    [limite, total],
  );

  const anterior = useCallback(() => irAPagina(pagina - 1), [irAPagina, pagina]);
  const siguiente = useCallback(() => irAPagina(pagina + 1), [irAPagina, pagina]);

  return {
    pagina,
    limite,
    totalPaginas,
    offset: (pagina - 1) * limite,
    irAPagina,
    anterior,
    siguiente,
  };
}
