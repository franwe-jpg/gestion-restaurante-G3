import { useId } from 'react';
import type { SVGProps } from 'react';

import type { Ambiente, Bloque, PlanoGenerado, Segmento } from './types';

const PARED_EXTERIOR = '#475569';
const PARED_INTERIOR = '#64748b';
const DETALLE = '#94a3b8';
const PISO = '#f3f4f6';

function Linea({ tramo, ...trazo }: { tramo: Segmento } & SVGProps<SVGLineElement>) {
  return (
    <line
      x1={tramo.desde.x}
      y1={tramo.desde.y}
      x2={tramo.hasta.x}
      y2={tramo.hasta.y}
      strokeLinecap="square"
      {...trazo}
    />
  );
}

/** Ventana: hueco en la pared con dos líneas finas paralelas (marco) y el vidrio al medio. */
function Ventana({ hueco }: { hueco: Segmento }) {
  const horizontal = hueco.desde.y === hueco.hasta.y;
  const corrido = (d: number): Segmento => ({
    desde: { x: hueco.desde.x + (horizontal ? 0 : d), y: hueco.desde.y + (horizontal ? d : 0) },
    hasta: { x: hueco.hasta.x + (horizontal ? 0 : d), y: hueco.hasta.y + (horizontal ? d : 0) },
  });
  return (
    <g data-ventana="">
      <Linea tramo={corrido(-3)} stroke={PARED_EXTERIOR} strokeWidth={1.5} strokeLinecap="butt" />
      <Linea tramo={corrido(0)} stroke={DETALLE} strokeWidth={1} strokeLinecap="butt" />
      <Linea tramo={corrido(3)} stroke={PARED_EXTERIOR} strokeWidth={1.5} strokeLinecap="butt" />
    </g>
  );
}

function BloqueDeServicio({ bloque, rayado }: { bloque: Bloque; rayado: string }) {
  const esCocina = bloque.tipo === 'cocina';
  return (
    <g>
      <rect
        x={bloque.x}
        y={bloque.y}
        width={bloque.ancho}
        height={bloque.alto}
        rx={esCocina ? 0 : 3}
        fill={esCocina ? `url(#${rayado})` : '#ffffff'}
        stroke={esCocina ? 'none' : DETALLE}
        strokeWidth={1.5}
      />
      <text
        x={bloque.x + bloque.ancho / 2}
        y={bloque.y + bloque.alto / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-600 text-[9px] font-bold tracking-[.08em] uppercase"
      >
        {bloque.nombre}
      </text>
    </g>
  );
}

function Aberturas({ ambiente }: { ambiente: Ambiente }) {
  return (
    <>
      {ambiente.ventanas.map((hueco, i) => (
        <Ventana key={`v${i}`} hueco={hueco} />
      ))}
      {ambiente.puertas.map((puerta, i) => (
        <g key={`p${i}`} data-puerta="">
          <Linea tramo={puerta.hoja} stroke={PARED_EXTERIOR} strokeWidth={2} strokeLinecap="butt" />
          <path d={puerta.arco} fill="none" stroke={DETALLE} strokeWidth={1} />
        </g>
      ))}
      {ambiente.entrada !== null && (
        <text
          x={ambiente.entrada.x}
          y={ambiente.entrada.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-500 text-[9px] font-bold tracking-[.06em] uppercase"
        >
          Entrada
        </text>
      )}
    </>
  );
}

function Paredes({ ambiente }: { ambiente: Ambiente }) {
  return (
    <>
      {ambiente.baranda !== null && (
        <path
          data-baranda=""
          d={ambiente.baranda}
          fill="none"
          stroke={PARED_INTERIOR}
          strokeWidth={2.5}
          strokeDasharray="8 5"
        />
      )}
      {ambiente.paredesInteriores.map((tramo, i) => (
        <Linea key={`i${i}`} tramo={tramo} stroke={PARED_INTERIOR} strokeWidth={4} />
      ))}
      {ambiente.paredes.map((tramo, i) => (
        <Linea key={`e${i}`} tramo={tramo} stroke={PARED_EXTERIOR} strokeWidth={6} />
      ))}
    </>
  );
}

/** Croquis del local detrás de las mesas: pisos, cocina y barra, paredes, ventanas y puertas. */
export function ContornoDelPlano({ plano }: { plano: PlanoGenerado }) {
  const rayado = `rayado-${useId().replace(/:/g, '')}`;
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0"
      width={plano.ancho}
      height={plano.alto}
      viewBox={`0 0 ${plano.ancho} ${plano.alto}`}
    >
      <defs>
        <pattern
          id={rayado}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="#e2e8f0" />
          <line x1="0" y1="0" x2="0" y2="7" stroke={DETALLE} strokeWidth="2" />
        </pattern>
      </defs>
      {plano.ambientes.map((ambiente) => (
        <path key={`piso-${ambiente.sector.id}`} d={ambiente.piso} fill={PISO} />
      ))}
      {plano.ambientes.map((ambiente) => (
        <g key={ambiente.sector.id}>
          {ambiente.bloques.map((bloque) => (
            <BloqueDeServicio key={bloque.tipo} bloque={bloque} rayado={rayado} />
          ))}
          <Paredes ambiente={ambiente} />
          <Aberturas ambiente={ambiente} />
        </g>
      ))}
    </svg>
  );
}
