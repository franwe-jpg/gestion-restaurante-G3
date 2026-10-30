import { useState } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { listarSeccionesHabilitadas } from '../api';
import type { MenuDelDia } from '../types';

import { FormularioMenuDelDia } from './FormularioMenuDelDia';
import { MenuDelDiaLista } from './MenuDelDiaLista';
import { useBajaMenuDelDia } from './useBajaMenuDelDia';
import { useEditarMenuDelDia } from './useEditarMenuDelDia';
import { useListaMenusDelDia } from './useListaMenusDelDia';

/** Pestaña «Menú del día»: lista, alta, modificación y baja (HU-M2-04, 05 y 06). */
export function MenuDelDiaTab() {
  const [enEdicion, setEnEdicion] = useState<MenuDelDia | null>(null);
  const { mostrarToast } = useToast();

  const lista = useListaMenusDelDia();
  const secciones = useListaSecciones();
  const darDeBaja = useBajaMenuDelDia(lista.menus.recargar);
  const alEditar = useEditarMenuDelDia(setEnEdicion);

  const alGuardar = (menu: MenuDelDia) => {
    mostrarToast({
      titulo:
        menu.estado === 'DESHABILITADO'
          ? 'Menú del día deshabilitado'
          : enEdicion === null
            ? 'Menú del día creado'
            : 'Menú del día modificado',
      variante: 'success',
    });
    setEnEdicion(null);
    lista.menus.recargar();
  };

  const cancelar = enEdicion === null ? {} : { onCancelar: () => setEnEdicion(null) };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <MenuDelDiaLista
        menus={lista.menus}
        pagina={lista.pagina}
        limite={lista.limite}
        onPagina={lista.setPagina}
        estado={lista.estado}
        onCambiarEstado={lista.cambiarEstado}
        onEditar={(menu) => void alEditar(menu)}
        onDarDeBaja={(menu) => void darDeBaja(menu)}
      />
      <Card>
        <CardContent className="pt-6">
          <FormularioMenuDelDia
            key={enEdicion?.id ?? 'alta'}
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

function useListaSecciones() {
  return useApi(() => listarSeccionesHabilitadas(), 'secciones-habilitadas');
}
