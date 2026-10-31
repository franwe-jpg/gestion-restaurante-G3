import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearMedioPago, modificarMedioPago } from '../api';
import type { Estado, MedioPago, MedioPagoCrear, TipoMedioPago } from '../types';

import { errorDelServidor, validarMedioPago } from './validarMedioPago';
import type { ErrorDelServidor } from './validarMedioPago';

export interface OpcionesFormularioMedioPago {
  medioPago?: MedioPago | null;
  onGuardado: () => void;
}

function guardar(medioPago: MedioPago | null, datos: MedioPagoCrear, estado: Estado) {
  return medioPago === null
    ? crearMedioPago(datos)
    : modificarMedioPago(medioPago.id, { ...datos, estado });
}

/** HU-M6-04 y HU-M6-05: alta sin medio de pago, edición con él. */
export function useFormularioMedioPago({
  medioPago = null,
  onGuardado,
}: OpcionesFormularioMedioPago) {
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState(medioPago?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoMedioPago | ''>(medioPago?.tipo ?? '');
  const [descripcion, setDescripcion] = useState(medioPago?.descripcion ?? '');
  const [estado, setEstado] = useState<Estado>(medioPago?.estado ?? 'HABILITADO');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarMedioPago({ nombre, tipo, descripcion });
    setErrores(locales);
    if (Object.keys(locales).length > 0 || tipo === '') return;

    setEnviando(true);
    const datos = { nombre: nombre.trim(), tipo, descripcion: descripcion.trim() || null };
    const respuesta = await guardar(medioPago, datos, estado);
    setEnviando(false);

    if (respuesta.exito) {
      const titulo = medioPago === null ? 'Medio de pago creado' : 'Medio de pago modificado';
      mostrarToast({ titulo, variante: 'success' });
      onGuardado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo guardar el medio de pago'));
  };

  return {
    nombre,
    setNombre,
    tipo,
    setTipo,
    descripcion,
    setDescripcion,
    estado,
    setEstado,
    errores,
    enviando,
    enviar,
  };
}
