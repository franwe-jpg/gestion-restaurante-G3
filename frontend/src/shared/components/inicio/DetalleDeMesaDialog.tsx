import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../ui/badge';
import type { BadgeVariant } from '../ui/badge';
import { Dialog } from '../ui/dialog';

import { ComandaDeLaMesa } from './ComandaDeLaMesa';
import { ENLACE_SECUNDARIO, ESTILO_ENLACE_BOTON } from './estilos';
import { ReservaDeLaMesa } from './ReservaDeLaMesa';
import type { EstadoVisibleMesa, MesaDelMapa } from './types';

const ETIQUETAS: Record<EstadoVisibleMesa, { texto: string; variante: BadgeVariant }> = {
  LIBRE: { texto: 'Libre', variante: 'neutral' },
  RESERVADA: { texto: 'Libre · con reserva', variante: 'success' },
  OCUPADA: { texto: 'Ocupada', variante: 'danger' },
  FUERA_DE_SERVICIO: { texto: 'Fuera de servicio', variante: 'neutral' },
};

/** Abre el alta con la mesa elegida, con el mismo enlace que Salón (`?mesa=`, S4-03). */
function MesaLibre({ mesaId }: { mesaId: number }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">La mesa está libre y no tiene una comanda abierta.</p>
      <Link
        to={`/atencion?mesa=${mesaId}`}
        className={`${ESTILO_ENLACE_BOTON} ${ENLACE_SECUNDARIO} w-full`}
      >
        Nueva comanda
      </Link>
    </div>
  );
}

function ContenidoDeMesa({ mesa }: { mesa: MesaDelMapa }) {
  const { texto, variante } = ETIQUETAS[mesa.estadoVisible];
  const libre = mesa.estadoVisible === 'LIBRE' || mesa.estadoVisible === 'RESERVADA';
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto">
      <Badge variant={variante}>{texto}</Badge>
      {mesa.estadoVisible === 'OCUPADA' && <ComandaDeLaMesa mesaId={mesa.id} />}
      {mesa.reserva !== undefined && <ReservaDeLaMesa reserva={mesa.reserva} />}
      {libre && <MesaLibre mesaId={mesa.id} />}
      {mesa.estadoVisible === 'FUERA_DE_SERVICIO' && (
        <p className="text-sm text-slate-600">
          La mesa está fuera de servicio. Se habilita desde Salón, Mozos y Chefs.
        </p>
      )}
    </div>
  );
}

export interface DetalleDeMesaDialogProps {
  mesa: MesaDelMapa | null;
  onCerrar: () => void;
}

/** Detalle de la mesa elegida en el plano, según su estado (como `#detalle-mesa` de la maqueta). */
export function DetalleDeMesaDialog({ mesa, onCerrar }: DetalleDeMesaDialogProps) {
  const alCambiar = useCallback(
    (abierto: boolean) => {
      if (!abierto) onCerrar();
    },
    [onCerrar],
  );
  return (
    <Dialog
      open={mesa !== null}
      onOpenChange={alCambiar}
      title={mesa === null ? '' : `Mesa ${mesa.numero}`}
      description={mesa === null ? undefined : `${mesa.sector.nombre} · ${mesa.capacidad} personas`}
    >
      {mesa !== null && <ContenidoDeMesa key={mesa.id} mesa={mesa} />}
    </Dialog>
  );
}
