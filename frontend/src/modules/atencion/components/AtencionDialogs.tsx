import { Dialog } from '../../../shared/components/ui/dialog';
import { CambiarMozoDialog } from './CambiarMozoDialog';
import { CierreComandaDialog } from './CierreComandaDialog';
import { ComandaForm } from './ComandaForm';
import { EntregasComandaDialog } from './EntregasComandaDialog';
import { ModificarComandaDialog } from './ModificarComandaDialog';
import type { useCambioDeMozo } from './useCambioDeMozo';

interface EntregasAbiertas {
  id: number;
  volverACierre: boolean;
}

interface Props {
  alta: boolean;
  mesaInicial?: string;
  cierreId: number | null;
  modificarId: number | null;
  entregas: EntregasAbiertas | null;
  cambioMozo: ReturnType<typeof useCambioDeMozo>;
  /** Sin `COMANDAS_OPERAR` el detalle de la comanda no permite registrar entregas. */
  soloLectura: boolean;
  onAlta: (abierto: boolean) => void;
  onCreada: () => void;
  onSalirCierre: () => void;
  onCerrada: () => void;
  onEntregasDesdeCierre: (id: number) => void;
  onSalirEntregas: () => void;
  onSalirModificar: () => void;
  onModificada: () => void;
}

export function AtencionDialogs(props: Props) {
  const { cierreId } = props;
  return (
    <>
      {props.alta && (
        <Dialog open title="Nueva comanda" size="lg" onOpenChange={props.onAlta}>
          <ComandaForm onCreada={props.onCreada} mesaInicial={props.mesaInicial} />
        </Dialog>
      )}
      {cierreId !== null && (
        <CierreComandaDialog
          id={cierreId}
          onSalir={props.onSalirCierre}
          onCerrada={props.onCerrada}
          onEntregas={() => props.onEntregasDesdeCierre(cierreId)}
        />
      )}
      {props.entregas && (
        <EntregasComandaDialog
          id={props.entregas.id}
          soloLectura={props.soloLectura}
          onSalir={props.onSalirEntregas}
        />
      )}
      {props.modificarId !== null && (
        <ModificarComandaDialog
          id={props.modificarId}
          onSalir={props.onSalirModificar}
          onModificada={props.onModificada}
        />
      )}
      {props.cambioMozo.cambio && (
        <CambiarMozoDialog
          {...props.cambioMozo.cambio}
          onSalir={props.cambioMozo.salir}
          onCambiado={props.cambioMozo.cambiado}
        />
      )}
    </>
  );
}
