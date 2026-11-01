import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import type { MesaDisponible } from '../types';

import type { EstadoMesasDisponibles } from './useMesasDisponibles';

export interface SelectorMesaProps {
  estado: EstadoMesasDisponibles;
  /** `id` de la mesa elegida como texto, o `''` si no hay ninguna. */
  valor: string;
  /** Error de la validación local; gana sobre el mensaje de la consulta. */
  error?: string;
  onCambiar: (valor: string) => void;
}

const ID_SELECTOR = 'reserva-mesa';

/** `Supuesto:` el texto de la opción vacía no está fijado por la spec (preguntas abiertas). */
const TEXTO_SIN_ELEGIR = 'Seleccione una mesa';
const TEXTO_CARGANDO = 'Cargando mesas…';
const TEXTO_SIN_MESAS = 'No hay mesas disponibles para esa fecha y hora';

function textoDeMesa({ numero, capacidad, sector }: MesaDisponible): string {
  return `${sector.nombre} · Mesa ${numero} (${capacidad} personas)`;
}

/** Solo `listo` con mesas se puede usar; los demás estados dejan el selector deshabilitado. */
function estaHabilitado(estado: EstadoMesasDisponibles): boolean {
  return estado.tipo === 'listo' && estado.mesas.length > 0;
}

function Opciones({ estado }: { estado: EstadoMesasDisponibles }) {
  if (estado.tipo === 'cargando') return <option value="">{TEXTO_CARGANDO}</option>;
  if (estado.tipo !== 'listo') return null;
  if (estado.mesas.length === 0) return <option value="">{TEXTO_SIN_MESAS}</option>;
  return (
    <>
      <option value="">{TEXTO_SIN_ELEGIR}</option>
      {estado.mesas.map((mesa) => (
        <option key={mesa.id} value={String(mesa.id)}>
          {textoDeMesa(mesa)}
        </option>
      ))}
    </>
  );
}

/**
 * Campo Mesa del alta: se elige entre las mesas disponibles para la fecha y la hora (Decisión 19).
 * El valor de cada opción es el `id` de la mesa, que se envía como `mesa_id`.
 */
export function SelectorMesa({ estado, valor, error, onCambiar }: SelectorMesaProps) {
  const errorDelCampo = error ?? (estado.tipo === 'error' ? estado.mensaje : undefined);
  return (
    <FormField id={ID_SELECTOR} label="Mesa" required error={errorDelCampo}>
      <Select
        id={ID_SELECTOR}
        value={valor}
        disabled={!estaHabilitado(estado)}
        onChange={(evento) => onCambiar(evento.target.value)}
      >
        <Opciones estado={estado} />
      </Select>
    </FormField>
  );
}
