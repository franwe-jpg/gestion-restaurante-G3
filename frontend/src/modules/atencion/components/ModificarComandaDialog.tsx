import { Button } from '../../../shared/components/ui/button';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Dialog } from '../../../shared/components/ui/dialog';
import type { DetalleComandaSalida } from '../types';
import { DetallePedidoFila } from './DetallePedidoFila';
import type { LineaPedido } from './DetallePedidoFila';
import { useComandaParaModificar } from './useComandaParaModificar';
import { useModificacionComanda } from './useModificacionComanda';

interface Props {
  id: number;
  onSalir: () => void;
  onModificada: () => void;
}

function descripcionDetalle(detalle: DetalleComandaSalida): string {
  const referencia =
    detalle.producto_id !== null
      ? `Producto #${detalle.producto_id}`
      : `Menú #${detalle.menu_ejecutivo_id}`;
  return `${referencia} — cantidad ${detalle.cantidad}`;
}

function DetallesActuales({
  detalles,
  quitar,
  total,
  onAlternar,
}: {
  detalles: DetalleComandaSalida[];
  quitar: number[];
  total: number;
  onAlternar: (detalleId: number) => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-medium">Detalles actuales</h3>
      <p className="text-sm text-slate-500">Marcá los productos que quieras quitar.</p>
      <ul className="space-y-2">
        {detalles.map((detalle, indice) => {
          const detalleId = detalle.id;
          return (
            <li key={detalleId ?? `detalle-${indice}`} className="flex items-center gap-3">
              <Checkbox
                aria-label={`Quitar ${descripcionDetalle(detalle)}`}
                checked={typeof detalleId === 'number' && quitar.includes(detalleId)}
                disabled={typeof detalleId !== 'number'}
                onChange={() => {
                  if (typeof detalleId === 'number') onAlternar(detalleId);
                }}
              />
              <span>{descripcionDetalle(detalle)}</span>
              <span className="text-sm text-slate-500">
                {detalle.precio_unitario} c/u − descuento {detalle.descuento}
              </span>
            </li>
          );
        })}
      </ul>
      <p>Total actual: {total.toFixed(2)}</p>
    </section>
  );
}

function NuevasLineas({
  lineas,
  onAgregar,
  onCambiar,
  onQuitar,
}: {
  lineas: LineaPedido[];
  onAgregar: () => void;
  onCambiar: (linea: LineaPedido) => void;
  onQuitar: (clave: number) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium">Agregar productos</h3>
      {lineas.map((linea, indice) => (
        <DetallePedidoFila
          key={linea.clave}
          linea={linea}
          numero={indice + 1}
          puedeQuitar
          onChange={onCambiar}
          onQuitar={() => onQuitar(linea.clave)}
        />
      ))}
      <Button type="button" variant="outline" onClick={onAgregar}>
        Agregar línea
      </Button>
    </section>
  );
}

export function ModificarComandaDialog({ id, onSalir, onModificada }: Props) {
  const { comanda, setComanda, error: errorCarga } = useComandaParaModificar(id);
  const mod = useModificacionComanda(id, comanda, setComanda, onModificada);
  return (
    <Dialog
      open
      title={`Modificar comanda #${id}`}
      size="lg"
      onOpenChange={(abierto) => {
        if (!abierto && !mod.guardando) onSalir();
      }}
    >
      <form onSubmit={(evento) => void mod.enviar(evento)} className="space-y-4">
        {!comanda && !errorCarga && <p role="status">Cargando comanda…</p>}
        {errorCarga && <p role="alert">{errorCarga}</p>}
        {mod.aviso && <p role="status">{mod.aviso}</p>}
        {comanda && (
          <>
            <DetallesActuales
              detalles={mod.detalles}
              quitar={mod.quitar}
              total={mod.total}
              onAlternar={mod.alternar}
            />
            <NuevasLineas
              lineas={mod.nuevas}
              onAgregar={mod.agregar}
              onCambiar={mod.cambiar}
              onQuitar={mod.quitarLinea}
            />
          </>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!comanda || mod.sinCambios || mod.sinDetalles || mod.guardando}
          >
            Guardar cambios
          </Button>
          <Button type="button" variant="outline" disabled={mod.guardando} onClick={onSalir}>
            Cerrar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
