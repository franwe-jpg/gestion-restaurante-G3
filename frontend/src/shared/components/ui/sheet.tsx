import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  title?: string;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = 'left',
  title = 'Navegación móvil',
}: SheetProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    }

    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet Content Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-50 flex h-full w-72 flex-col bg-white p-4 shadow-xl transition-transform duration-200 ease-in-out',
          side === 'left' ? 'mr-auto' : 'ml-auto',
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar menú móvil"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-3">{children}</div>
      </div>
    </div>
  );
}
