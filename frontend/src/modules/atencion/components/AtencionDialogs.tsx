import { CambiarMozoDialog } from './CambiarMozoDialog';
import { CierreComandaDialog } from './CierreComandaDialog';
import { ComandaFormDialog } from './ComandaForm';
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
  /** `COMANDAS_OPERAR`: permite registrar entregas en el diálogo de entregas. */
  puedeEntregar: boolean;
  /** `COMANDAS_MARCAR_LISTO`: permite marcar unidades listas en cocina. */
  puedeMarcarListo: boolean;
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
        <ComandaFormDialog
          onCreada={props.onCreada}
          mesaInicial={props.mesaInicial}
          onSalir={() => props.onAlta(false)}
        />
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
          puedeEntregar={props.puedeEntregar}
          puedeMarcarListo={props.puedeMarcarListo}
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
