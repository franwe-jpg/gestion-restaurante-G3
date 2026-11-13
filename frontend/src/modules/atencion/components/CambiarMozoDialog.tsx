import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { asignarMozoComanda } from '../api';
import type { MozoSeleccionable } from '../types';
import { CampoMozo } from './CampoMozo';
import { etiquetaMozo } from './catalogoComanda';
import { useCampoMozo } from './useCampoMozo';

interface Props {
  comandaId: number;
  /** `null` en una comanda histórica sin mozo: el selector arranca vacío. */
  mozoActual: MozoSeleccionable | null;
  onSalir: () => void;
  onCambiado: () => void;
}

/** Comanda elegida en el listado y su mozo actual, ya resuelto con el catálogo. */
export type CambioDeMozo = Pick<Props, 'comandaId' | 'mozoActual'>;

function useFormularioDeMozo({ comandaId, mozoActual, onCambiado }: Omit<Props, 'onSalir'>) {
  const idActual = mozoActual ? String(mozoActual.id) : '';
  const [mozoId, setMozoId] = useState(idActual);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campoMozo = useCampoMozo(mozoId, setMozoId, mozoActual ? etiquetaMozo(mozoActual) : '');
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await asignarMozoComanda(comandaId, Number(mozoId));
    setGuardando(false);
    if (respuesta.exito) onCambiado();
    else setError(respuesta.error ?? 'No se pudo cambiar el mozo de la comanda');
  }
  const bloqueado = guardando || mozoId === '' || mozoId === idActual;
  return { campoMozo, guardando, error, bloqueado, enviar };
}

export function CambiarMozoDialog({ onSalir, ...props }: Props) {
  const cambio = useFormularioDeMozo(props);
  return (
    <Dialog
      open
      title={`Cambiar mozo de la comanda #${props.comandaId}`}
      onOpenChange={(abierto) => {
        if (!abierto && !cambio.guardando) onSalir();
      }}
    >
      <form onSubmit={(evento) => void cambio.enviar(evento)} className="space-y-4">
        <fieldset disabled={cambio.guardando} className="space-y-3">
          <CampoMozo {...cambio.campoMozo} />
        </fieldset>
        {cambio.error && <p role="alert">{cambio.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={cambio.bloqueado}>
            Guardar mozo
          </Button>
          <Button
            type="button"
            variant="brand-outline"
            disabled={cambio.guardando}
            onClick={onSalir}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
