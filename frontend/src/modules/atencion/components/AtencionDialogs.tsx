import { Dialog } from '../../../shared/components/ui/dialog';
import { CierreComandaDialog } from './CierreComandaDialog';
import { ComandaForm } from './ComandaForm';
import { EntregasComandaDialog } from './EntregasComandaDialog';
import { ModificarComandaDialog } from './ModificarComandaDialog';

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
  /** Sin `COMANDAS_OPERAR` el detalle de la comanda no permite registrar entregas. */
  soloLectura: boolean;
  onAlta: (abierto: boolean) => void;
  onCreada: () => void;
  onSalirCierre: () => void;
  onCerrada: () => void;
  onEntregasDesdeCierre: () => void;
  onSalirEntregas: () => void;
  onSalirModificar: () => void;
  onModificada: () => void;
}

export function AtencionDialogs(props: Props) {
  return (
    <>
      {props.alta && (
        <Dialog open title="Nueva comanda" size="lg" onOpenChange={props.onAlta}>
          <ComandaForm onCreada={props.onCreada} mesaInicial={props.mesaInicial} />
        </Dialog>
      )}
      {props.cierreId !== null && (
        <CierreComandaDialog
          id={props.cierreId}
          onSalir={props.onSalirCierre}
          onCerrada={props.onCerrada}
          onEntregas={props.onEntregasDesdeCierre}
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
    </>
  );
}
