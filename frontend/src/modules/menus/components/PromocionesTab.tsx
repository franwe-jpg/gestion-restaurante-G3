import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { listarProductosParaPromocion } from '../api';
import type { Promocion } from '../types';

import { BarraPromociones } from './BarraPromociones';
import { DialogoPromocion } from './DialogoPromocion';
import { ListadoPromociones } from './ListadoPromociones';
import { useListaPromociones } from './useListaPromociones';

/** Pestaña «Promociones»: listado, alta y modificación (HU-M2-07 y HU-M2-08). */
export function PromocionesTab() {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [promocionEnEdicion, setPromocionEnEdicion] = useState<Promocion | null>(null);
  const lista = useListaPromociones();
  const productos = useApi(() => listarProductosParaPromocion(), 'productos-promocion');

  function abrirAlta() {
    setPromocionEnEdicion(null);
    setFormularioAbierto(true);
  }

  function abrirEdicion(promocion: Promocion) {
    setPromocionEnEdicion(promocion);
    setFormularioAbierto(true);
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setPromocionEnEdicion(null);
  }

  function promocionGuardada() {
    cerrarFormulario();
    lista.recargar();
  }

  return (
    <div className="space-y-6">
      <BarraPromociones onNueva={abrirAlta} />
      <ListadoPromociones
        promociones={lista.promociones}
        pagina={lista.pagina}
        totalPaginas={lista.totalPaginas}
        cargando={lista.cargando}
        error={lista.error}
        onReintentar={lista.recargar}
        onCambiarPagina={lista.cambiarPagina}
        onEditar={abrirEdicion}
        onFinalizada={lista.recargar}
      />
      <DialogoPromocion
        abierto={formularioAbierto}
        promocion={promocionEnEdicion}
        productos={productos.datos ?? []}
        cargandoProductos={productos.cargando}
        errorProductos={productos.error ?? undefined}
        onCambiar={(abierto) => {
          if (!abierto) cerrarFormulario();
        }}
        onGuardado={promocionGuardada}
      />
    </div>
  );
}
