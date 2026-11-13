import { useState } from 'react';

import { useSesion } from '../../../shared/auth/useSesion';
import { ExportButton } from '../../../shared/components/ui/export-button';
import type { MenuEjecutivo } from '../types';
import { BarraMenusEjecutivos } from './BarraMenusEjecutivos';
import { DialogoMenuEjecutivo } from './DialogoMenuEjecutivo';
import { ListadoMenuEjecutivos } from './ListadoMenuEjecutivos';
import { useListaMenusEjecutivos } from './useListaMenusEjecutivos';
import { useOpcionesMenuEjecutivo } from './useOpcionesMenuEjecutivo';

function useGestorMenus() {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [menuEnEdicion, setMenuEnEdicion] = useState<MenuEjecutivo | null>(null);
  const opciones = useOpcionesMenuEjecutivo();
  const listado = useListaMenusEjecutivos();

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setMenuEnEdicion(null);
  }

  function abrirAlta() {
    setMenuEnEdicion(null);
    setFormularioAbierto(true);
  }

  function abrirEdicion(menu: MenuEjecutivo) {
    setMenuEnEdicion(menu);
    setFormularioAbierto(true);
  }

  function menuGuardado() {
    const eraAlta = menuEnEdicion === null;
    cerrarFormulario();
    if (eraAlta) listado.cambiarPagina(1);
    listado.recargar();
  }

  return {
    formularioAbierto,
    menuEnEdicion,
    opciones,
    listado,
    cerrarFormulario,
    abrirAlta,
    abrirEdicion,
    menuGuardado,
  };
}

export function MenusEjecutivosTab() {
  const {
    formularioAbierto,
    menuEnEdicion,
    opciones,
    listado,
    cerrarFormulario,
    abrirAlta,
    abrirEdicion,
    menuGuardado,
  } = useGestorMenus();
  const gestiona = useSesion().puede('MENUS_GESTIONAR');

  return (
    <div className="space-y-6">
      <ListadoMenuEjecutivos
        menus={listado.menus}
        pagina={listado.pagina}
        limite={listado.limite}
        total={listado.total}
        totalPaginas={listado.totalPaginas}
        cargando={listado.cargando}
        error={listado.error}
        onReintentar={listado.recargar}
        onCambiarPagina={listado.cambiarPagina}
        onEditar={gestiona ? abrirEdicion : undefined}
        onDadoDeBaja={gestiona ? listado.recargar : undefined}
        toolbar={
          <BarraMenusEjecutivos
            estado={listado.estado}
            onCambiarEstado={listado.cambiarEstado}
            onNuevo={gestiona ? abrirAlta : undefined}
            acciones={<ExportButton filas={listado.menus} nombreArchivo="menus-ejecutivos" />}
          />
        }
      />

      <DialogoMenuEjecutivo
        abierto={formularioAbierto}
        menu={menuEnEdicion}
        productos={opciones.productos}
        secciones={opciones.secciones}
        cargandoOpciones={opciones.cargando}
        errorCarga={opciones.error}
        onCambiar={(abierto) => {
          if (!abierto) cerrarFormulario();
        }}
        onGuardado={menuGuardado}
      />
    </div>
  );
}
