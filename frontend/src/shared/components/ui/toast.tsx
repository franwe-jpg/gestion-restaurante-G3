import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { cn } from '../../lib/utils';
import { ToastContext } from './toast-context';
import type { Toast, ToastOptions, ToastVariant } from './toast-context';

const ESTILOS: Record<ToastVariant, string> = {
  info: 'border-info-border bg-info-subtle text-info-strong',
  success: 'border-success-border bg-success-subtle text-success-strong',
  warning: 'border-warning-border bg-warning-subtle text-warning-strong',
  danger: 'border-danger-border bg-danger-subtle text-danger-strong',
};

const ICONOS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const temporizadoresRef = useRef<number[]>([]);

  const cerrar = useCallback((id: number) => {
    setToasts((previos) => previos.filter((toast) => toast.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (options: ToastOptions) => {
      idRef.current += 1;
      const id = idRef.current;
      const duracion = options.duracion ?? 4000;

      setToasts((previos) => [...previos, { id, ...options }]);
      const temporizador = window.setTimeout(() => cerrar(id), duracion);
      temporizadoresRef.current.push(temporizador);
    },
    [cerrar],
  );

  useEffect(() => {
    const temporizadores = temporizadoresRef.current;

    return () => {
      temporizadores.forEach((temporizador) => window.clearTimeout(temporizador));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const variante = toast.variante ?? 'info';
          const Icono = ICONOS[variante];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-md border p-3 shadow-lg',
                ESTILOS[variante],
              )}
            >
              <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.titulo}</p>
                {toast.descripcion && (
                  <p className="mt-0.5 text-xs opacity-90">{toast.descripcion}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => cerrar(toast.id)}
                aria-label="Cerrar notificación"
                className="rounded p-1 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
