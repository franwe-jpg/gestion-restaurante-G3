import { cn } from '../../lib/utils';

const ESTADOS: [string, string][] = [
  ['Libre', 'border-gray-400 bg-gray-200'],
  ['Ocupada', 'border-red-400 bg-red-100'],
  ['Con reserva', 'border-green-400 bg-gray-200'],
  ['Fuera de servicio', 'border-dashed border-gray-400 bg-gray-100'],
];

/** Referencia de colores del plano (como `.dt` de la maqueta). */
export function LeyendaDelMapa() {
  return (
    <ul
      aria-label="Leyenda del plano"
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"
    >
      {ESTADOS.map(([texto, clase]) => (
        <li key={texto} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('inline-block size-3.5 rounded border-2', clase)}
          />
          {texto}
        </li>
      ))}
    </ul>
  );
}
