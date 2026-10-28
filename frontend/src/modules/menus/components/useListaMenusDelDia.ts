import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { listarMenusDelDia } from '../api';
import type { FiltroEstado } from '../types';

const LIMITE = 10;

export function useListaMenusDelDia() {
  const [estado, setEstado] = useState<FiltroEstado>('HABILITADO');
  const [pagina, setPagina] = useState(1);
  const menus = useApi(
    () => listarMenusDelDia(estado, LIMITE, (pagina - 1) * LIMITE),
    `menus-del-dia-${estado}-${pagina}`,
  );

  const cambiarEstado = (nuevoEstado: FiltroEstado) => {
    setEstado(nuevoEstado);
    setPagina(1);
  };

  return { estado, cambiarEstado, pagina, setPagina, limite: LIMITE, menus };
}
