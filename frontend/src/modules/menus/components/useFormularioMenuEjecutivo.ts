import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearMenuEjecutivo, modificarMenuEjecutivo } from '../api';
import type { Estado, MenuEjecutivo, MenuEjecutivoCrear } from '../types';

import { errorDelServidor, validarMenuEjecutivo } from './validarMenuEjecutivo';
import type { DatosFormularioMenuEjecutivo, ErroresMenuEjecutivo } from './validarMenuEjecutivo';

interface OpcionesFormulario {
  menu?: MenuEjecutivo | null;
  onGuardado: () => void;
}

const INICIAL: DatosFormularioMenuEjecutivo = {
  nombre: '',
  precio_fijo: '',
  producto_ids: [],
  seccion_id: '',
  descripcion: '',
};

function datosIniciales(menu?: MenuEjecutivo | null): DatosFormularioMenuEjecutivo {
  if (!menu) return INICIAL;
  return {
    nombre: menu.nombre,
    precio_fijo: menu.precio_fijo,
    producto_ids: menu.productos.map((producto) => producto.id),
    seccion_id: String(menu.seccion.id),
    descripcion: menu.descripcion ?? '',
  };
}

function datosDeEnvio(datos: DatosFormularioMenuEjecutivo): MenuEjecutivoCrear {
  return {
    nombre: datos.nombre.trim(),
    precio_fijo: datos.precio_fijo.trim(),
    producto_ids: datos.producto_ids,
    seccion_id: Number(datos.seccion_id),
    descripcion: datos.descripcion.trim() || null,
  };
}

function errorAlGuardar(mensaje: string | undefined, editando: boolean): string {
  if (mensaje) return mensaje;
  return editando
    ? 'No se pudo actualizar el menú ejecutivo'
    : 'No se pudo crear el menú ejecutivo';
}

export function useFormularioMenuEjecutivo({ menu, onGuardado }: OpcionesFormulario) {
  const editando = Boolean(menu);
  const [datos, setDatos] = useState(() => datosIniciales(menu));
  const [estado, setEstado] = useState<Estado>(menu?.estado ?? 'HABILITADO');
  const [errores, setErrores] = useState<ErroresMenuEjecutivo>({});
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  function actualizar<K extends keyof DatosFormularioMenuEjecutivo>(
    campo: K,
    valor: DatosFormularioMenuEjecutivo[K],
  ) {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
  }

  async function enviar() {
    const fallas = validarMenuEjecutivo(datos);
    setErrores(fallas);
    if (Object.keys(fallas).length > 0) return;

    setEnviando(true);
    try {
      const respuesta = menu
        ? await modificarMenuEjecutivo(menu.id, { ...datosDeEnvio(datos), estado })
        : await crearMenuEjecutivo(datosDeEnvio(datos));
      if (!respuesta.exito || respuesta.datos === null) {
        setErrores(errorDelServidor(errorAlGuardar(respuesta.error, editando)));
        return;
      }
      mostrarToast({
        titulo: editando ? 'Menú ejecutivo actualizado' : 'Menú ejecutivo creado',
        variante: 'success',
      });
      setDatos(INICIAL);
      onGuardado();
    } finally {
      setEnviando(false);
    }
  }

  return { datos, estado, errores, enviando, actualizar, cambiarEstado: setEstado, enviar };
}
