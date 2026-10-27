import { useState } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { listarMenusDelDia, listarSeccionesHabilitadas, obtenerMenuDelDia } from '../api';
import type { MenuDelDia, MenuDelDiaListado } from '../types';

import { FormularioMenuDelDia } from './FormularioMenuDelDia';
import { MenuDelDiaLista } from './MenuDelDiaLista';
import { useBajaMenuDelDia } from './useBajaMenuDelDia';

const LIMITE = 10;

/** Pestaña «Menú del día»: lista, alta, modificación y baja (HU-M2-04, 05 y 06). */
export function MenuDelDiaTab() {
  const [pagina, setPagina] = useState(1);
  const [enEdicion, setEnEdicion] = useState<MenuDelDia | null>(null);
  const { mostrarToast } = useToast();

  const menus = useApi(
    () => listarMenusDelDia('TODOS', LIMITE, (pagina - 1) * LIMITE),
    `menus-del-dia-${pagina}`,
  );
  const secciones = useApi(() => listarSeccionesHabilitadas(), 'secciones-habilitadas');
  const darDeBaja = useBajaMenuDelDia(menus.recargar);

  const alGuardar = () => {
    mostrarToast({
      titulo: enEdicion === null ? 'Menú del día creado' : 'Menú del día modificado',
      variante: 'success',
    });
    setEnEdicion(null);
    menus.recargar();
  };

  const alEditar = async (menu: MenuDelDiaListado) => {
    const respuesta = await obtenerMenuDelDia(menu.id);
    if (respuesta.exito && respuesta.datos !== null) setEnEdicion(respuesta.datos);
  };

  const cancelar = enEdicion === null ? {} : { onCancelar: () => setEnEdicion(null) };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <MenuDelDiaLista
        menus={menus}
        pagina={pagina}
        limite={LIMITE}
        onPagina={setPagina}
        onEditar={(menu) => void alEditar(menu)}
        onDarDeBaja={(menu) => void darDeBaja(menu)}
      />
      <Card>
        <CardContent className="pt-6">
          <FormularioMenuDelDia
            secciones={secciones.datos?.items ?? []}
            menu={enEdicion ?? undefined}
            onGuardado={alGuardar}
            {...cancelar}
          />
        </CardContent>
      </Card>
    </div>
  );
}
