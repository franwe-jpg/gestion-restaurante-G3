import { createContext } from 'react';

export interface ConfirmOptions {
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: 'default' | 'danger';
}

export type Confirmar = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<Confirmar | null>(null);
