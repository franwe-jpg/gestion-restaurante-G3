import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import { crearSector, modificarSector } from '../api';
import type { Sector, SectorModificar } from '../types';

import { errorDelServidor, validarSector } from './validarSector';
import type { ErrorDelServidor } from './validarSector';

export interface OpcionesFormularioSector {
  sector?: Sector | null;
  onGuardado: () => void;
}

export function useFormularioSector({ sector = null, onGuardado }: OpcionesFormularioSector) {
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState(sector?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(sector?.descripcion ?? '');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    const locales = validarSector({ nombre, descripcion });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const datos: SectorModificar = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
    };
    const respuesta =
      sector === null ? await crearSector(datos) : await modificarSector(sector.id, datos);
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({
        titulo: sector === null ? 'Sector creado' : 'Sector modificado',
        variante: 'success',
      });
      onGuardado();
      return;
    }
    const porDefecto =
      sector === null ? 'No se pudo crear el sector' : 'No se pudo modificar el sector';
    setErrores(errorDelServidor(respuesta.error ?? porDefecto));
  };

  return { nombre, setNombre, descripcion, setDescripcion, errores, enviando, enviar };
}
