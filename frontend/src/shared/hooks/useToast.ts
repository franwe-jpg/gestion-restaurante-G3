import { useContext } from 'react';

import { ToastContext } from '../components/ui/toast-context';
import type { ToastContextValue } from '../components/ui/toast-context';

const SIN_PROVEEDOR: ToastContextValue = {
  mostrarToast: () => undefined,
};

export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? SIN_PROVEEDOR;
}
