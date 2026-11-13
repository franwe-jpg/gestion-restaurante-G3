import { useState } from 'react';

import { useSesion } from '../../../shared/auth/useSesion';
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

interface PanelFormularioProps {
  enEdicion: MenuDelDia | null;
  secciones: ReturnType<typeof useListaSecciones>;
  onGuardado: (menu: MenuDelDia) => void;
  onCancelar: () => void;
}

/** Alta y modificación en el mismo formulario; solo lo ve quien gestiona los menús. */
function PanelFormulario({ enEdicion, secciones, onGuardado, onCancelar }: PanelFormularioProps) {
  const cancelar = enEdicion === null ? {} : { onCancelar };
  return (
    <Card>
      <CardContent className="pt-6">
        <FormularioMenuDelDia
          key={enEdicion?.id ?? 'alta'}
          secciones={secciones.datos?.items ?? []}
          menu={enEdicion ?? undefined}
          onGuardado={onGuardado}
          {...cancelar}
        />
      </CardContent>
    </Card>
  );
}

function tituloDelAviso(menu: MenuDelDia, esAlta: boolean): string {
  if (menu.estado === 'DESHABILITADO') return 'Menú del día deshabilitado';
  return esAlta ? 'Menú del día creado' : 'Menú del día modificado';
}

/** Pestaña «Menú del día»: lista, alta, modificación y baja (HU-M2-04, 05 y 06). */
export function MenuDelDiaTab() {
  const gestiona = useSesion().puede('MENUS_GESTIONAR');
  const [enEdicion, setEnEdicion] = useState<MenuDelDia | null>(null);
  const { mostrarToast } = useToast();

  const lista = useListaMenusDelDia();
  const secciones = useListaSecciones();
  const darDeBaja = useBajaMenuDelDia(lista.menus.recargar);
  const alEditar = useEditarMenuDelDia(setEnEdicion);

  const alGuardar = (menu: MenuDelDia) => {
    mostrarToast({ titulo: tituloDelAviso(menu, enEdicion === null), variante: 'success' });
    setEnEdicion(null);
    lista.menus.recargar();
  };

  return (
    <div
      className={gestiona ? 'grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'grid gap-4'}
    >
      <MenuDelDiaLista
        menus={lista.menus}
        pagina={lista.pagina}
        limite={lista.limite}
        onPagina={lista.setPagina}
        estado={lista.estado}
        onCambiarEstado={lista.cambiarEstado}
        onEditar={gestiona ? (menu) => void alEditar(menu) : undefined}
        onDarDeBaja={gestiona ? (menu) => void darDeBaja(menu) : undefined}
      />
      {gestiona && (
        <PanelFormulario
          enEdicion={enEdicion}
          secciones={secciones}
          onGuardado={alGuardar}
          onCancelar={() => setEnEdicion(null)}
        />
      )}
    </div>
  );
}

function useListaSecciones() {
  return useApi(() => listarSeccionesHabilitadas(), 'secciones-habilitadas');
}
