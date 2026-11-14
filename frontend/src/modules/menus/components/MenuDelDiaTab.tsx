import { useState } from 'react';

import { useSesion } from '../../../shared/auth/useSesion';
import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { listarSeccionesHabilitadas } from '../api';
import type { MenuDelDia } from '../types';

import { DialogoMenuDelDia } from './FormularioMenuDelDia';
import { MenuDelDiaLista } from './MenuDelDiaLista';
import { useBajaMenuDelDia } from './useBajaMenuDelDia';
import { useEditarMenuDelDia } from './useEditarMenuDelDia';
import { useListaMenusDelDia } from './useListaMenusDelDia';

function tituloDelAviso(menu: MenuDelDia, esAlta: boolean): string {
  if (menu.estado === 'DESHABILITADO') return 'Menú del día deshabilitado';
  return esAlta ? 'Menú del día creado' : 'Menú del día modificado';
}

/** Pestaña «Menú del día»: lista, alta, modificación y baja (HU-M2-04, 05 y 06). */
export function MenuDelDiaTab() {
  const gestiona = useSesion().puede('MENUS_GESTIONAR');
  // `menu` presente edita esa fila; sin ella, el diálogo crea un menú del día.
  const [dialogo, setDialogo] = useState<{ menu?: MenuDelDia } | null>(null);
  const { mostrarToast } = useToast();

  const lista = useListaMenusDelDia();
  const secciones = useListaSecciones();
  const darDeBaja = useBajaMenuDelDia(lista.menus.recargar);
  const alEditar = useEditarMenuDelDia((menu) => setDialogo({ menu }));

  const alGuardar = (menu: MenuDelDia) => {
    mostrarToast({
      titulo: tituloDelAviso(menu, dialogo?.menu === undefined),
      variante: 'success',
    });
    setDialogo(null);
    lista.menus.recargar();
  };

  return (
    <>
      <MenuDelDiaLista
        menus={lista.menus}
        pagina={lista.pagina}
        limite={lista.limite}
        onPagina={lista.setPagina}
        estado={lista.estado}
        onCambiarEstado={lista.cambiarEstado}
        onNuevo={gestiona ? () => setDialogo({}) : undefined}
        onEditar={gestiona ? (menu) => void alEditar(menu) : undefined}
        onDarDeBaja={gestiona ? (menu) => void darDeBaja(menu) : undefined}
      />
      {dialogo && (
        <DialogoMenuDelDia
          secciones={secciones.datos?.items ?? []}
          menu={dialogo.menu}
          onGuardado={alGuardar}
          onOpenChange={(abierto) => !abierto && setDialogo(null)}
        />
      )}
    </>
  );
}

function useListaSecciones() {
  return useApi(() => listarSeccionesHabilitadas(), 'secciones-habilitadas');
}
