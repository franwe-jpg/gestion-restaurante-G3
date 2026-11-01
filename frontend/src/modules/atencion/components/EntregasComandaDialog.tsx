import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import type { DetalleEntrega, EntregasComanda } from '../types';
import { useEntregas } from './useEntregas';

interface Props {
  id: number;
  onSalir: () => void;
}

function referencia(detalle: DetalleEntrega): string {
  return detalle.producto_id !== null
    ? `Producto #${detalle.producto_id}`
    : `Menú ejecutivo #${detalle.menu_ejecutivo_id}`;
}

function EntregaFila({
  detalle,
  bloqueado,
  onCambiar,
}: {
  detalle: DetalleEntrega;
  bloqueado: boolean;
  onCambiar: (valor: number) => void;
}) {
  const nombre = referencia(detalle);
  const { cantidad, cantidad_entregada: entregadas } = detalle;
  const entregado = detalle.estado_entrega === 'ENTREGADO';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
      <span className="font-medium">{nombre}</span>
      <span>
        {entregadas} de {cantidad}
      </span>
      <Badge variant={entregado ? 'success' : 'warning'}>
        {entregado ? 'Entregado' : 'Pendiente'}
      </Badge>
      <span className="flex items-center gap-2">
        <Button
          variant="outline"
          aria-label={`Restar una unidad de ${nombre}`}
          disabled={bloqueado || entregadas === 0}
          onClick={() => onCambiar(entregadas - 1)}
        >
          −
        </Button>
        <Button
          variant="outline"
          aria-label={`Sumar una unidad de ${nombre}`}
          disabled={bloqueado || entregadas === cantidad}
          onClick={() => onCambiar(entregadas + 1)}
        >
          +
        </Button>
        <Button
          variant="outline"
          aria-label={`Entregar todo de ${nombre}`}
          disabled={bloqueado || entregadas === cantidad}
          onClick={() => onCambiar(cantidad)}
        >
          Entregar todo
        </Button>
      </span>
    </li>
  );
}

function Avisos({ datos, error }: { datos: EntregasComanda | null; error: string }) {
  const completa = datos !== null && datos.detalles.every((d) => d.estado_entrega === 'ENTREGADO');
  return (
    <>
      {!datos && !error && <p role="status">Cargando entregas…</p>}
      {error && <p role="alert">{error}</p>}
      {completa && <p>No falta servir nada</p>}
      {datos && datos.estado !== 'ABIERTA' && (
        <p>La comanda está {datos.estado}: no se pueden cambiar las entregas.</p>
      )}
    </>
  );
}

export function EntregasComandaDialog({ id, onSalir }: Props) {
  const { datos, error, enviando, registrar } = useEntregas(id);
  const bloqueado = enviando || datos?.estado !== 'ABIERTA';
  return (
    <Dialog
      open
      size="lg"
      title={`Entregas de la comanda #${id}`}
      onOpenChange={(abierto) => {
        if (!abierto) onSalir();
      }}
    >
      <div className="space-y-4">
        <Avisos datos={datos} error={error} />
        {datos && (
          <ul className="space-y-2">
            {datos.detalles.map((detalle) => (
              <EntregaFila
                key={detalle.id}
                detalle={detalle}
                bloqueado={bloqueado}
                onCambiar={(valor) => void registrar(detalle.id, valor)}
              />
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={onSalir}>
          Volver
        </Button>
      </div>
    </Dialog>
  );
}
