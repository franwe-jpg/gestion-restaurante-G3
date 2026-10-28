import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearMenuEjecutivo } from '../api';
import type { MenuEjecutivoCrear } from '../types';

import { errorDelServidor, validarMenuEjecutivo } from './validarMenuEjecutivo';
import type { DatosFormularioMenuEjecutivo, ErroresMenuEjecutivo } from './validarMenuEjecutivo';

interface OpcionesFormulario {
  onCreado: () => void;
}

const INICIAL: DatosFormularioMenuEjecutivo = {
  nombre: '',
  precio_fijo: '',
  producto_ids: [],
  seccion_id: '',
  descripcion: '',
};

function datosDeEnvio(datos: DatosFormularioMenuEjecutivo): MenuEjecutivoCrear {
  return {
    nombre: datos.nombre.trim(),
    precio_fijo: datos.precio_fijo.trim(),
    producto_ids: datos.producto_ids,
    seccion_id: Number(datos.seccion_id),
    descripcion: datos.descripcion.trim() || null,
  };
}

export function useFormularioMenuEjecutivo({ onCreado }: OpcionesFormulario) {
  const [datos, setDatos] = useState(INICIAL);
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
      const respuesta = await crearMenuEjecutivo(datosDeEnvio(datos));
      if (!respuesta.exito || respuesta.datos === null) {
        setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear el menú ejecutivo'));
        return;
      }
      mostrarToast({ titulo: 'Menú ejecutivo creado', variante: 'success' });
      setDatos(INICIAL);
      onCreado();
    } finally {
      setEnviando(false);
    }
  }

  return { datos, errores, enviando, actualizar, enviar };
}
