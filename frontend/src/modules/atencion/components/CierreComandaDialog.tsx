import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { cerrarComanda, consultarPendientes } from '../api';
import type { PendientesComanda } from '../types';

interface Props {
  id: number;
  onSalir: () => void;
  onCerrada: () => void;
  onEntregas: () => void;
}

function useCierre(id: number, onCerrada: () => void) {
  const [datos, setDatos] = useState<PendientesComanda | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    let vigente = true;
    void consultarPendientes(id).then((r) => {
      if (!vigente) return;
      if (r.exito && r.datos) setDatos(r.datos);
      else setError(r.error ?? 'No se pudieron consultar las entregas');
    });
    return () => {
      vigente = false;
    };
  }, [id]);
  async function confirmar() {
    if (!datos || datos.pendientes.length > 0 || ocupado) return;
    setOcupado(true);
    setError('');
    const respuesta = await cerrarComanda(id);
    if (respuesta.exito) {
      onCerrada();
      return;
    }
    setError(respuesta.error ?? 'No se pudo cerrar la comanda');
    setDatos(null);
    const actual = await consultarPendientes(id);
    if (actual.exito && actual.datos) setDatos(actual.datos);
    setOcupado(false);
  }
  return { datos, error, ocupado, confirmar };
}

export function CierreComandaDialog({ id, onSalir, onCerrada, onEntregas }: Props) {
  const cierre = useCierre(id, onCerrada);
  const pendientes = cierre.datos?.pendientes ?? [];
  return (
    <Dialog
      open
      title={`Cerrar comanda #${id}`}
      onOpenChange={(abierto) => {
        if (!abierto && !cierre.ocupado) onSalir();
      }}
    >
      <div className="space-y-4">
        {!cierre.datos && !cierre.error && <p role="status">Consultando entregas…</p>}
        {cierre.error && <p role="alert">{cierre.error}</p>}
        {pendientes.length > 0 && (
          <>
            <p>No se puede cerrar: hay detalles pendientes.</p>
            <ul>
              {pendientes.map((p) => (
                <li key={p.id}>
                  Detalle #{p.id}:{' '}
                  {p.producto_id !== null
                    ? `Producto #${p.producto_id}`
                    : `Menú #${p.menu_ejecutivo_id}`}{' '}
                  — cantidad {p.cantidad}
                </li>
              ))}
            </ul>
            <Button disabled={cierre.ocupado} onClick={onEntregas}>
              Gestionar entregas
            </Button>
          </>
        )}
        {cierre.datos && pendientes.length === 0 && (
          <>
            <p>Todos los detalles están entregados. ¿Confirmar el cierre?</p>
            <Button disabled={cierre.ocupado} onClick={() => void cierre.confirmar()}>
              Confirmar cierre
            </Button>
          </>
        )}
        <Button variant="outline" disabled={cierre.ocupado} onClick={onSalir}>
          Cancelar
        </Button>
      </div>
    </Dialog>
  );
}
