import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import type { Persona } from '../types';

import { conInicial } from './tipoPersona';
import type { TipoPersona } from './tipoPersona';

export interface OpcionesBajaPersona {
  tipo: TipoPersona;
  descripcion: string;
  baja: (id: number) => Promise<RespuestaApi<unknown>>;
  onEliminado: () => void;
}

/** Confirmación, baja y avisos de una persona del listado (mozo o chef). */
export function useBajaPersona({ tipo, descripcion, baja, onEliminado }: OpcionesBajaPersona) {
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async (persona: Pick<Persona, 'id' | 'nombre' | 'apellido'>) => {
    const aceptado = await confirmar({
      titulo: `¿Dar de baja a ${persona.apellido}, ${persona.nombre}?`,
      descripcion,
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setEliminando(true);
    const respuesta = await baja(persona.id);
    setEliminando(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: `${conInicial(tipo)} dado de baja`, variante: 'success' });
      onEliminado();
      return;
    }
    mostrarToast({
      titulo: `No se pudo dar de baja al ${tipo}`,
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { eliminando, eliminar };
}
