import { X } from 'lucide-react';

export interface ChipsProps {
  valores: string[];
  onQuitar: (valor: string) => void;
}

export function Chips({ valores, onQuitar }: ChipsProps) {
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
            className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-slate-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
