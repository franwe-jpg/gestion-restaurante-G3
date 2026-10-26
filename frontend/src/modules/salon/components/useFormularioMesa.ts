import { useState } from 'react';

import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { crearMesa, listarSectoresHabilitados } from '../api';

import { errorDelServidor, validarMesa } from './validarMesa';
import type { ErrorDelServidor } from './validarMesa';

export interface OpcionesFormularioMesa {
  onCreado: () => void;
}

export function useFormularioMesa({ onCreado }: OpcionesFormularioMesa) {
  const { mostrarToast } = useToast();
  const consulta = useApi(listarSectoresHabilitados, 'sectores-habilitados');
  const [numero, setNumero] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const sectores = (consulta.datos?.items ?? []).filter((sector) => sector.estado === 'HABILITADO');

  const enviar = async () => {
    if (enviando) return;
    const locales = validarMesa({ numero, capacidad, sectorId });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const respuesta = await crearMesa({
      numero: Number(numero.trim()),
      capacidad: Number(capacidad.trim()),
      sector_id: Number(sectorId),
    });
    setEnviando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: 'Mesa creada', variante: 'success' });
      onCreado();
      return;
    }
    setErrores(errorDelServidor(respuesta.error ?? 'No se pudo crear la mesa'));
  };

  return {
    numero,
    setNumero,
    capacidad,
    setCapacidad,
    sectorId,
    setSectorId,
    sectores,
    cargandoSectores: consulta.cargando,
    errorDeCarga: consulta.error,
    errores,
    enviando,
    enviar,
  };
}
