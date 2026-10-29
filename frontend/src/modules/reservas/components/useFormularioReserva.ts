import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearReserva } from '../api';
import { horaActualLocal, hoyLocal } from '../fechas';
import type { ReservaCrear } from '../types';

import { errorDelServidor, validarReserva } from './validarReserva';
import type { DatosFormularioReserva, ErrorDelServidor } from './validarReserva';

export interface OpcionesFormularioReserva {
  onGuardado: () => void;
}

const DATOS_VACIOS: DatosFormularioReserva = {
  cliente: '',
  fecha: '',
  hora: '',
  cantidad: '',
  mesa: '',
};

function aReservaCrear(datos: DatosFormularioReserva): ReservaCrear {
  return {
    mesa_id: Number(datos.mesa),
    cliente_id: Number(datos.cliente),
    fecha: datos.fecha,
    hora: datos.hora,
    cantidad_personas: Number(datos.cantidad),
  };
}

export function useFormularioReserva({ onGuardado }: OpcionesFormularioReserva) {
  const { mostrarToast } = useToast();
  const [datos, setDatos] = useState<DatosFormularioReserva>(DATOS_VACIOS);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof DatosFormularioReserva, valor: string) => {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  };

  const enviar = async () => {
    const locales = validarReserva(datos, 'alta', hoyLocal(), horaActualLocal());
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const respuesta = await crearReserva(aReservaCrear(datos));
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Reserva creada', variante: 'success' });
      onGuardado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear la reserva'));
  };

  return { datos, cambiar, errores, enviando, enviar };
}
