import { useApi } from '../../hooks/useApi';
import { Spinner } from '../ui/spinner';

import { obtenerCliente } from './api';
import { ErrorDelBloque } from './ErrorDelBloque';
import type { ReservaActiva } from './types';

/** Reserva de hoy de una mesa libre: hora, cliente (se pide al abrir) y cantidad de personas. */
export function ReservaDeLaMesa({ reserva }: { reserva: ReservaActiva }) {
  const cliente = useApi(() => obtenerCliente(reserva.cliente_id), `cliente-${reserva.cliente_id}`);
  const nombre = cliente.datos?.nombre ?? `Cliente n.º ${reserva.cliente_id}`;
  return (
    <div className="space-y-3">
      <div className="space-y-1 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
        <p className="font-bold">Reservada hoy a las {reserva.hora}</p>
        {cliente.cargando && <Spinner />}
        {!cliente.cargando && cliente.error === null && (
          <p>
            {nombre} · {reserva.cantidad_personas} personas
          </p>
        )}
        <p>Mientras tanto la mesa se puede usar.</p>
      </div>
      {cliente.error !== null && (
        <ErrorDelBloque mensaje={cliente.error} onReintentar={cliente.recargar} />
      )}
    </div>
  );
}
