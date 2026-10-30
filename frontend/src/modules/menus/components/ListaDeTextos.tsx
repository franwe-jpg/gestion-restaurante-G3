import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import { Chips } from './Chips';

export interface ListaDeTextosProps {
  id: string;
  etiqueta: string;
  singular: string;
  valores: string[];
  onCambiar: (valores: string[]) => void;
  tope: number;
  maximoPorTexto: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

interface Reglas {
  valores: string[];
  singular: string;
  tope: number;
  maximoPorTexto: number;
}

function motivoDeRechazo(limpio: string, reglas: Reglas): string | null {
  const { valores, singular, tope, maximoPorTexto } = reglas;
  if (limpio === '') return 'No se puede agregar un texto vacío.';
  if (limpio.length > maximoPorTexto) return `Cada ${singular} admite hasta ${maximoPorTexto}.`;
  if (valores.some((valor) => valor.toLowerCase() === limpio.toLowerCase())) {
    return `"${limpio}" ya está en la lista.`;
  }
  if (valores.length >= tope) return `Se alcanzó el máximo de ${tope}.`;
  return null;
}

/** Chips editables: Enter agrega el texto y cada chip se puede quitar (HU-M2-04, CA 6 y 14). */
export function ListaDeTextos({
  id,
  etiqueta,
  singular,
  valores,
  onCambiar,
  tope,
  maximoPorTexto,
  placeholder,
  required,
  error,
}: ListaDeTextosProps) {
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const agregar = () => {
    const limpio = texto.trim();
    const rechazo = motivoDeRechazo(limpio, { valores, singular, tope, maximoPorTexto });
    setErrorLocal(rechazo);
    if (rechazo !== null) return;
    onCambiar([...valores, limpio]);
    setTexto('');
  };

  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault(); // Enter agrega el texto, no envía el formulario
    agregar();
  };

  return (
    <FormField id={id} label={etiqueta} required={required} error={errorLocal ?? error}>
      <Chips
        valores={valores}
        onQuitar={(valor) => onCambiar(valores.filter((o) => o !== valor))}
      />
      <Input
        id={id}
        value={texto}
        placeholder={placeholder}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={alTeclear}
      />
    </FormField>
  );
}
