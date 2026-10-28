import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { BarraMenusEjecutivos, DialogoMenuEjecutivo, ListadoMenuEjecutivos } from '../components';
import { useListaMenusEjecutivos } from '../components/useListaMenusEjecutivos';
import { useOpcionesMenuEjecutivo } from '../components/useOpcionesMenuEjecutivo';

export function MenusPage() {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const opciones = useOpcionesMenuEjecutivo();
  const listado = useListaMenusEjecutivos();

  function cerrarFormulario() {
    setFormularioAbierto(false);
  }

  function menuCreado() {
    cerrarFormulario();
    listado.cambiarPagina(1);
    listado.recargar();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Menús y Promociones"
        descripcion="Creá menús ejecutivos con productos habilitados y precio fijo."
      />

      <BarraMenusEjecutivos
        estado={listado.estado}
        onCambiarEstado={listado.cambiarEstado}
        onNuevo={() => setFormularioAbierto(true)}
      />

      <ListadoMenuEjecutivos
        menus={listado.menus}
        pagina={listado.pagina}
        totalPaginas={listado.totalPaginas}
        cargando={listado.cargando}
        error={listado.error}
        onReintentar={listado.recargar}
        onCambiarPagina={listado.cambiarPagina}
      />

      <DialogoMenuEjecutivo
        abierto={formularioAbierto}
        productos={opciones.productos}
        secciones={opciones.secciones}
        cargandoOpciones={opciones.cargando}
        errorCarga={opciones.error}
        onCambiar={setFormularioAbierto}
        onCreado={menuCreado}
      />
    </div>
  );
}
