import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearSector } from '../api';

import { errorDelServidor, validarSector } from './validarSector';
import type { ErrorDelServidor } from './validarSector';

export interface OpcionesFormularioSector {
  onCreado: () => void;
}

export function useFormularioSector({ onCreado }: OpcionesFormularioSector) {
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarSector({ nombre, descripcion });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const respuesta = await crearSector({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    });
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Sector creado', variante: 'success' });
      onCreado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear el sector'));
  };

  return { nombre, setNombre, descripcion, setDescripcion, errores, enviando, enviar };
}
