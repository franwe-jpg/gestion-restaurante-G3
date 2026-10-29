import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { BarraMenusEjecutivos, DialogoMenuEjecutivo, ListadoMenuEjecutivos } from '../components';
import { useListaMenusEjecutivos } from '../components/useListaMenusEjecutivos';
import { useOpcionesMenuEjecutivo } from '../components/useOpcionesMenuEjecutivo';
import type { MenuEjecutivo } from '../types';

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

export function MenusPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Menús y Promociones"
        descripcion="Creá menús ejecutivos con productos habilitados y precio fijo."
      />

      <BarraMenusEjecutivos
        estado={listado.estado}
        onCambiarEstado={listado.cambiarEstado}
        onNuevo={abrirAlta}
      />

      <ListadoMenuEjecutivos
        menus={listado.menus}
        pagina={listado.pagina}
        totalPaginas={listado.totalPaginas}
        cargando={listado.cargando}
        error={listado.error}
        onReintentar={listado.recargar}
        onCambiarPagina={listado.cambiarPagina}
        onEditar={abrirEdicion}
        onDadoDeBaja={listado.recargar}
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
