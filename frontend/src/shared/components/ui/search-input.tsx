import { Search, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Input } from './input';
import type { InputProps } from './input';

export interface SearchInputProps extends InputProps {
  onLimpiar?: () => void;
}

export function SearchInput({ className, value, onLimpiar, ...props }: SearchInputProps) {
  const tieneValor = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input value={value} className="pl-9 pr-9" {...props} />
      {onLimpiar && tieneValor && (
        <button
          type="button"
          onClick={onLimpiar}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
