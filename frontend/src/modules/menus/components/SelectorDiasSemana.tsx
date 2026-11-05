import type { DiaSemana } from '../types';

const DIAS: { valor: DiaSemana; etiqueta: string }[] = [
  { valor: 'LUNES', etiqueta: 'Lunes' },
  { valor: 'MARTES', etiqueta: 'Martes' },
  { valor: 'MIERCOLES', etiqueta: 'Miércoles' },
  { valor: 'JUEVES', etiqueta: 'Jueves' },
  { valor: 'VIERNES', etiqueta: 'Viernes' },
  { valor: 'SABADO', etiqueta: 'Sábado' },
  { valor: 'DOMINGO', etiqueta: 'Domingo' },
];

interface SelectorDiasSemanaProps {
  seleccionados: DiaSemana[];
  error?: string;
  onCambiar: (dias: DiaSemana[]) => void;
}

function alternar(dias: DiaSemana[], dia: DiaSemana): DiaSemana[] {
  return dias.includes(dia) ? dias.filter((actual) => actual !== dia) : [...dias, dia];
}

export function SelectorDiasSemana({ seleccionados, error, onCambiar }: SelectorDiasSemanaProps) {
  return (
    <div
      role="group"
      aria-label="Días de la semana"
      aria-describedby={error ? 'dias-semana-error' : undefined}
      className="flex flex-wrap gap-3 rounded-md border border-slate-200 p-3"
    >
      {DIAS.map((dia) => (
        <label key={dia.valor} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            aria-label={dia.etiqueta}
            checked={seleccionados.includes(dia.valor)}
            onChange={() => onCambiar(alternar(seleccionados, dia.valor))}
          />
          {dia.etiqueta}
        </label>
      ))}
    </div>
  );
}
