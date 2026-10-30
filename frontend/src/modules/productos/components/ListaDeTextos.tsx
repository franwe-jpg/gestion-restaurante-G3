import { X } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

export interface ListaDeTextosProps {
  id: string;
  etiqueta: string;
  singular: string;
  plural: string;
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
  plural: string;
  tope: number;
  maximoPorTexto: number;
}

/** Devuelve el mensaje de por qué no se puede agregar el texto, o null si se puede. */
function motivoDeRechazo(texto: string, reglas: Reglas): string | null {
  const { valores, singular, plural, tope, maximoPorTexto } = reglas;
  if (texto === '') return 'No se puede agregar un texto vacío.';
  if (texto.length > maximoPorTexto) {
    return `Cada ${singular} admite hasta ${maximoPorTexto} caracteres.`;
  }
  if (valores.some((valor) => valor.toLowerCase() === texto.toLowerCase())) {
    return `"${texto}" ya está en la lista.`;
  }
  if (valores.length >= tope) return `Se alcanzó el máximo de ${tope} ${plural}.`;
  return null;
}

function Chips({ valores, onQuitar }: { valores: string[]; onQuitar: (valor: string) => void }) {
  if (valores.length === 0) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-1.5">
      {valores.map((valor) => (
        <li
          key={valor}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-100 pr-1 pl-2.5 text-[13px] font-medium text-slate-700"
        >
          {valor}
          <button
            type="button"
            aria-label={`Quitar ${valor}`}
            onClick={() => onQuitar(valor)}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Chips editables: Enter agrega el texto escrito y cada chip se puede quitar. */
export function ListaDeTextos({
  id,
  etiqueta,
  valores,
  onCambiar,
  placeholder,
  required,
  error,
  ...limites
}: ListaDeTextosProps) {
  const [texto, setTexto] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const agregar = () => {
    const limpio = texto.trim();
    const motivo = motivoDeRechazo(limpio, { valores, ...limites });
    setErrorLocal(motivo);
    if (motivo) return;
    onCambiar([...valores, limpio]);
    setTexto('');
  };

  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault(); // Enter no debe enviar el formulario
    agregar();
  };

  return (
    <FormField id={id} label={etiqueta} required={required} error={errorLocal ?? error}>
      <Chips
        valores={valores}
        onQuitar={(valor) => onCambiar(valores.filter((v) => v !== valor))}
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
