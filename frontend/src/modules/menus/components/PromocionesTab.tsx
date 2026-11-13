import { useState } from 'react';

import { useSesion } from '../../../shared/auth/useSesion';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { useApi } from '../../../shared/hooks/useApi';
import { listarProductosParaPromocion } from '../api';
import type { Promocion } from '../types';

import { BarraPromociones } from './BarraPromociones';
import { DialogoPromocion } from './DialogoPromocion';
import { ListadoPromociones } from './ListadoPromociones';
import { useListaPromociones } from './useListaPromociones';

interface ListadoDePromocionesProps {
  lista: ReturnType<typeof useListaPromociones>;
  gestiona: boolean;
  onNueva: () => void;
  onEditar: (promocion: Promocion) => void;
}

/** Tarjeta de promociones con su barra de filtros y acciones. */
function ListadoDePromociones({ lista, gestiona, onNueva, onEditar }: ListadoDePromocionesProps) {
  return (
    <ListadoPromociones
      promociones={lista.promociones}
      pagina={lista.pagina}
      limite={lista.limite}
      total={lista.total}
      totalPaginas={lista.totalPaginas}
      cargando={lista.cargando}
      error={lista.error}
      onReintentar={lista.recargar}
      onCambiarPagina={lista.cambiarPagina}
      onEditar={gestiona ? onEditar : undefined}
      onFinalizada={gestiona ? lista.recargar : undefined}
      toolbar={
        <BarraPromociones
          onNueva={gestiona ? onNueva : undefined}
          acciones={<ExportButton filas={lista.promociones} nombreArchivo="promociones" />}
        />
      }
    />
  );
}

/** Pestaña «Promociones»: listado, alta y modificación (HU-M2-07 y HU-M2-08). */
export function PromocionesTab() {
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [promocionEnEdicion, setPromocionEnEdicion] = useState<Promocion | null>(null);
  const gestiona = useSesion().puede('MENUS_GESTIONAR');
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
      <ListadoDePromociones
        lista={lista}
        gestiona={gestiona}
        onNueva={abrirAlta}
        onEditar={abrirEdicion}
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
