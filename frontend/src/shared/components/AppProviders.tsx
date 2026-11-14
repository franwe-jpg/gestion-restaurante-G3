import type { ReactNode } from 'react';

import { SesionProvider } from '../auth/SesionProvider';

import { ConfirmProvider } from './ui/confirm-dialog';
import { ToastProvider } from './ui/toast';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SesionProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </SesionProvider>
  );
}
