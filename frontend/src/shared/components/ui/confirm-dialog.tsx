import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from './button';
import { ConfirmContext } from './confirm-context';
import type { ConfirmOptions } from './confirm-context';
import { Dialog } from './dialog';

interface SolicitudConfirmacion {
  opciones: ConfirmOptions;
  resolver: (resultado: boolean) => void;
}

export interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [solicitud, setSolicitud] = useState<SolicitudConfirmacion | null>(null);

  const confirmar = useCallback((opciones: ConfirmOptions) => {
    return new Promise<boolean>((resolver) => {
      setSolicitud({ opciones, resolver });
    });
  }, []);

  const cerrar = (resultado: boolean) => {
    if (!solicitud) return;
    solicitud.resolver(resultado);
    setSolicitud(null);
  };

  const opciones = solicitud?.opciones;

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Dialog
        open={solicitud !== null}
        onOpenChange={(abierto) => {
          if (!abierto) cerrar(false);
        }}
        title={opciones?.titulo ?? ''}
        description={opciones?.descripcion}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => cerrar(false)}>
              {opciones?.textoCancelar ?? 'Cancelar'}
            </Button>
            <Button
              variant={opciones?.variante === 'danger' ? 'danger' : 'default'}
              onClick={() => cerrar(true)}
            >
              {opciones?.textoConfirmar ?? 'Confirmar'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}
