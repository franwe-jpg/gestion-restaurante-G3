import { useContext } from 'react';

import { ConfirmContext } from '../components/ui/confirm-context';
import type { Confirmar } from '../components/ui/confirm-context';

const SIN_PROVEEDOR: Confirmar = () => Promise.resolve(false);

export function useConfirm(): Confirmar {
  return useContext(ConfirmContext) ?? SIN_PROVEEDOR;
}
