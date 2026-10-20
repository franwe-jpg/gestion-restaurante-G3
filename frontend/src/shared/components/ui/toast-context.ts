import { createContext } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  titulo: string;
  descripcion?: string;
  variante?: ToastVariant;
  duracion?: number;
}

export interface Toast extends ToastOptions {
  id: number;
}

export interface ToastContextValue {
  mostrarToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
