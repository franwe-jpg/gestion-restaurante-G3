import { Clock } from 'lucide-react';

import { cn } from '../../lib/utils';

import { describirMesa, formaDeMesa } from './logicaMapaDelLocal';
import type { EstadoVisibleMesa, FormaMesa, PosicionEnPlano } from './types';

const MEDIDAS: Record<FormaMesa, string> = {
  redonda: 'h-[46px] w-[46px] rounded-full',
  cuadrada: 'h-14 w-14 rounded-[10px]',
  rectangular: 'h-14 w-24 rounded-[10px]',
  larga: 'h-14 w-32 rounded-[10px]',
};

/** Sillas alrededor de la mesa, `[izquierda, arriba]` en px (como `.t2` a `.t8` de la maqueta). */
const SILLAS: Record<FormaMesa, [number, number][]> = {
  redonda: [
    [-20, 16],
    [52, 16],
  ],
  cuadrada: [
    [21, -20],
    [21, 62],
    [-20, 21],
    [62, 21],
  ],
  rectangular: [
    [18, -20],
    [64, -20],
    [18, 62],
    [64, 62],
    [-20, 21],
    [102, 21],
  ],
  larga: [
    [16, -20],
    [57, -20],
    [98, -20],
    [16, 62],
    [57, 62],
    [98, 62],
    [-20, 21],
    [134, 21],
  ],
};

const ESTILO_DEL_ESTADO: Record<EstadoVisibleMesa, string> = {
  LIBRE: 'border-2 border-gray-400 bg-gray-200 text-gray-800',
  RESERVADA: 'border-[3px] border-green-400 bg-gray-200 text-gray-800 dark:border-green-500',
  OCUPADA:
    'border-2 border-red-400 bg-red-100 text-red-800 dark:border-red-500 dark:bg-red-950 dark:text-red-200',
  FUERA_DE_SERVICIO:
    'border-2 border-dashed border-gray-400 bg-[repeating-linear-gradient(45deg,#f3f4f6_0_6px,#e5e7eb_6px_12px)] text-gray-600 dark:bg-[repeating-linear-gradient(45deg,#1e293b_0_6px,#0f172a_6px_12px)]',
};

export interface MesaDelMapaProps {
  posicion: PosicionEnPlano;
  escala: number;
  atenuada: boolean;
  seleccionada: boolean;
  onElegir: (mesa: PosicionEnPlano['mesa']) => void;
}

function PildoraDeReserva({ hora }: { hora: string }) {
  return (
    <span className="absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
      <Clock aria-hidden="true" className="size-[11px]" strokeWidth={3} />
      {hora}
    </span>
  );
}

/** Mesa dibujada en el plano: forma y sillas por capacidad, color por estado; abre su detalle. */
export function MesaDelMapa({
  posicion,
  escala,
  atenuada,
  seleccionada,
  onElegir,
}: MesaDelMapaProps) {
  const { mesa, x, y } = posicion;
  const { forma } = formaDeMesa(mesa.capacidad);
  return (
    <button
      type="button"
      aria-label={describirMesa(mesa)}
      aria-haspopup="dialog"
      data-seleccionada={String(seleccionada)}
      onClick={() => onElegir(mesa)}
      className={cn(
        'group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-opacity focus-visible:outline-none',
        atenuada && 'opacity-25',
      )}
      style={{ left: x, top: y, scale: String(escala) }}
    >
      <span
        data-forma={forma}
        className={cn(
          'relative flex flex-col items-center justify-center group-hover:ring-4 group-hover:ring-slate-900/10',
          'group-focus-visible:outline-3 group-focus-visible:outline-offset-4 group-focus-visible:outline-amber-600',
          MEDIDAS[forma],
          ESTILO_DEL_ESTADO[mesa.estadoVisible],
          seleccionada && 'outline-3 outline-offset-4 outline-slate-900',
        )}
      >
        {SILLAS[forma].map(([x, y]) => (
          <span
            key={`${x},${y}`}
            data-silla=""
            className="absolute size-3.5 rounded bg-gray-300"
            style={{ left: x, top: y }}
          />
        ))}
        {mesa.horaReserva !== undefined && <PildoraDeReserva hora={mesa.horaReserva} />}
        <span className="font-display text-[17px] leading-none font-extrabold">{mesa.numero}</span>
        <span className="mt-0.5 text-[10px] font-semibold">{mesa.capacidad} pers.</span>
      </span>
    </button>
  );
}
