import { useState } from 'react';

import type { ToastContextValue } from '../../../shared/components/ui/toast-context';
import { useApi } from '../../../shared/hooks/useApi';
import { useToast } from '../../../shared/hooks/useToast';
import { crearMesa, listarSectoresHabilitados, modificarMesa } from '../api';
import type { Mesa, MesaModificar } from '../types';

import { errorDelServidor, validarMesa } from './validarMesa';
import type { ErrorDelServidor } from './validarMesa';

export interface OpcionesFormularioMesa {
  mesa?: Mesa | null;
  onGuardado: () => void;
}

interface EnvioMesa {
  mesa: Mesa | null;
  datos: MesaModificar;
  mostrarToast: ToastContextValue['mostrarToast'];
  onGuardado: () => void;
}

async function enviarMesa({ mesa, datos, mostrarToast, onGuardado }: EnvioMesa) {
  const respuesta = mesa === null ? await crearMesa(datos) : await modificarMesa(mesa.id, datos);
  if (respuesta.exito) {
    mostrarToast({
      titulo: mesa === null ? 'Mesa creada' : 'Mesa modificada',
      variante: 'success',
    });
    onGuardado();
    return null;
  }
  const porDefecto = mesa === null ? 'No se pudo crear la mesa' : 'No se pudo modificar la mesa';
  return errorDelServidor(respuesta.error ?? porDefecto);
}

export function useFormularioMesa({ mesa = null, onGuardado }: OpcionesFormularioMesa) {
  const { mostrarToast } = useToast();
  const consulta = useApi(listarSectoresHabilitados, 'sectores-habilitados');
  const [numero, setNumero] = useState(mesa ? String(mesa.numero) : '');
  const [capacidad, setCapacidad] = useState(mesa ? String(mesa.capacidad) : '');
  const [sectorId, setSectorId] = useState(mesa ? String(mesa.sector.id) : '');
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);

  const sectores = (consulta.datos?.items ?? []).filter((sector) => sector.estado === 'HABILITADO');

  const enviar = async () => {
    if (enviando) return;
    const locales = validarMesa({ numero, capacidad, sectorId });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const datos: MesaModificar = {
      numero: Number(numero.trim()),
      capacidad: Number(capacidad.trim()),
      sector_id: Number(sectorId),
    };
    const error = await enviarMesa({ mesa, datos, mostrarToast, onGuardado });
    setEnviando(false);
    if (error) setErrores(error);
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
