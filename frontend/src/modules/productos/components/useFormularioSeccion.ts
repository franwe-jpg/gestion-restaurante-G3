import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { crearSeccion, modificarSeccion } from '../api';
import type { ProductoSeleccionable, SeccionCrear, SeccionListado } from '../types';

import { errorDelServidor, validarSeccion } from './validarSeccion';
import type { ErrorDelServidor } from './validarSeccion';

export interface OpcionesFormulario {
  productos: ProductoSeleccionable[];
  /** Con `seccion` el formulario edita; sin ella, crea. */
  seccion?: SeccionListado;
  onGuardada: () => void;
}

const TEXTOS = {
  crear: { aviso: 'Sección creada', error: 'No se pudo crear la sección', destino: 'la nueva' },
  editar: {
    aviso: 'Sección modificada',
    error: 'No se pudo modificar la sección',
    destino: 'esta sección',
  },
};

function opcionesDelTraslado(descripcion: string) {
  return {
    titulo: 'Confirmar traslado de productos',
    descripcion,
    textoConfirmar: 'Trasladar',
    textoCancelar: 'No trasladar',
  };
}

export const AVISO_PRODUCTO_ACTUAL =
  'Todo producto debe pertenecer a una sección; para quitarlo, agréguelo a otra sección.';

function descripcionDelTraslado(
  productos: ProductoSeleccionable[],
  ids: number[],
  destino: string,
): string {
  const detalle = productos
    .filter((producto) => ids.includes(producto.id))
    .map((producto) => `${producto.nombre} (sección ${producto.seccion.nombre})`)
    .join(', ');
  return `Cada producto pertenece a una sola sección. Se van a trasladar a ${destino}: ${detalle}.`;
}

/** Los productos de la sección que ya están en el selector: no se pueden quitar (CA 4). */
function idsActuales(productos: ProductoSeleccionable[], seccion?: SeccionListado): number[] {
  if (!seccion) return [];
  return productos.filter((p) => p.seccion.id === seccion.id).map((p) => p.id);
}

function guardarSeccion(datos: SeccionCrear, seccion?: SeccionListado, habilitar = false) {
  if (!seccion) return crearSeccion(datos);
  return modificarSeccion(seccion.id, habilitar ? { ...datos, estado: 'HABILITADO' } : datos);
}

/** Selección de productos: los actuales de la sección no se pueden quitar y avisan (CA 4). */
function useSeleccionProductos(productos: ProductoSeleccionable[], seccion?: SeccionListado) {
  const actuales = idsActuales(productos, seccion);
  const [seleccion, setSeleccion] = useState<number[]>(actuales);
  const [avisoActual, setAvisoActual] = useState(false);

  const cambiarSeleccion = (ids: number[]) => {
    const quitaUnActual = actuales.some((id) => !ids.includes(id));
    setAvisoActual(quitaUnActual);
    if (!quitaUnActual) setSeleccion(ids);
  };

  return { actuales, seleccion, cambiarSeleccion, avisoActual };
}

export function useFormularioSeccion({ productos, seccion, onGuardada }: OpcionesFormulario) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const textos = seccion ? TEXTOS.editar : TEXTOS.crear;
  const { actuales, ...productosElegidos } = useSeleccionProductos(productos, seccion);
  const [nombre, setNombre] = useState(seccion?.nombre ?? '');
  const [orden, setOrden] = useState(seccion ? String(seccion.orden) : '');
  const [habilitar, setHabilitar] = useState(false);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const locales = validarSeccion({ nombre, orden });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    const nuevos = productosElegidos.seleccion.filter((id) => !actuales.includes(id));
    const descripcion = descripcionDelTraslado(productos, nuevos, textos.destino);
    if (nuevos.length > 0 && !(await confirmar(opcionesDelTraslado(descripcion)))) return;

    setEnviando(true);
    const respuesta = await guardarSeccion(
      {
        nombre: nombre.trim(),
        orden: Number(orden),
        producto_ids: nuevos,
        confirmar_traslado: nuevos.length > 0,
      },
      seccion,
      habilitar,
    );
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: textos.aviso, variante: 'success' });
      onGuardada();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? textos.error));
  };

  return {
    ...productosElegidos,
    nombre,
    setNombre,
    orden,
    setOrden,
    habilitar,
    setHabilitar,
    errores,
    enviando,
    enviar,
  };
}
