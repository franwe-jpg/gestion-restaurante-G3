import type { ReactNode } from 'react';

import { ConfirmProvider } from './ui/confirm-dialog';
import { ToastProvider } from './ui/toast';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
