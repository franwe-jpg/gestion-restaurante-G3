import { useState } from 'react';

import { modificarProducto } from '../api';
import { CONFIGURACIONES, CONFIGURACIONES_EDICION } from '../categorias';
import type { CategoriaEdicion } from '../categorias';
import type { ProductoSalida } from '../types';

import { useCampos, useEnvioProducto } from './useFormularioProducto';
import { precioParaEditar } from './validarProducto';

export interface OpcionesEdicionProducto {
  categoria: CategoriaEdicion;
  producto: ProductoSalida;
  onGuardado: () => void;
}

export function useEdicionProducto({ categoria, producto, onGuardado }: OpcionesEdicionProducto) {
  const configuracion = CONFIGURACIONES_EDICION[categoria];
  const campos = useCampos({
    nombre: producto.nombre,
    seccionId: String(producto.seccion.id),
    precio: precioParaEditar(producto.precio),
    ingredientes: producto.ingredientes,
    descripcion: producto.descripcion ?? '',
    etiquetas: producto.etiquetas,
  });
  const [estado, setEstado] = useState(producto.estado);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const envio = useEnvioProducto({
    campos,
    validacion: CONFIGURACIONES[categoria],
    guardar: (datos) =>
      modificarProducto(
        categoria,
        producto.id,
        // Con una imagen nueva, `quitar_imagen` iría en conflicto (422): la nueva reemplaza.
        { ...datos, estado, quitar_imagen: quitarImagen && campos.imagen === null },
        campos.imagen,
      ),
    exito: configuracion.modificado,
    errorPorDefecto: configuracion.errorAlModificar,
    onExito: onGuardado,
  });

  return { ...campos, ...envio, estado, setEstado, quitarImagen, setQuitarImagen };
}
