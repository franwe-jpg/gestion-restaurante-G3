import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearMozo, modificarMozo } from '../api';
import type { Mozo, MozoModificar } from '../types';

import { errorDelServidor, validarMozo } from './validarMozo';
import type { ErrorDelServidor } from './validarMozo';

export interface OpcionesFormularioMozo {
  mozo?: Mozo | null;
  onGuardado: () => void;
}

export function useFormularioMozo({ mozo = null, onGuardado }: OpcionesFormularioMozo) {
  const { mostrarToast } = useToast();
  const [dni, setDni] = useState(mozo?.dni ?? '');
  const [nombre, setNombre] = useState(mozo?.nombre ?? '');
  const [apellido, setApellido] = useState(mozo?.apellido ?? '');
  const [telefono, setTelefono] = useState(mozo?.telefono ?? '');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarMozo({ dni, nombre, apellido, telefono });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const datos: MozoModificar = {
      dni: dni.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim() || null,
    };
    const respuesta = mozo === null ? await crearMozo(datos) : await modificarMozo(mozo.id, datos);
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({
        titulo: mozo === null ? 'Mozo creado' : 'Mozo modificado',
        variante: 'success',
      });
      onGuardado();
      return;
    }
    const porDefecto = mozo === null ? 'No se pudo crear el mozo' : 'No se pudo modificar el mozo';
    setErrores(errorDelServidor(respuesta.error ?? porDefecto));
  };

  return {
    dni,
    setDni,
    nombre,
    setNombre,
    apellido,
    setApellido,
    telefono,
    setTelefono,
    errores,
    enviando,
    enviar,
  };
}
