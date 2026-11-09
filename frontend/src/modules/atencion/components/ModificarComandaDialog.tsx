import { Button } from '../../../shared/components/ui/button';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Dialog } from '../../../shared/components/ui/dialog';
import type {
  DetalleComandaCrear,
  DetalleComandaSalida,
  MenuEjecutivoSeleccionable,
  ProductoSeleccionable,
} from '../types';
import { DetallePedidoFila } from './DetallePedidoFila';
import type { LineaPedido } from './DetallePedidoFila';
import { useComandaParaModificar } from './useComandaParaModificar';
import { useCatalogoComanda } from './useCatalogoComanda';
import { useModificacionComanda } from './useModificacionComanda';

interface Props {
  id: number;
  onSalir: () => void;
  onModificada: () => void;
}

type NombreDe = (detalle: DetalleComandaCrear) => string;

function descripcionDetalle(detalle: DetalleComandaSalida, nombreDe: NombreDe): string {
  return `${nombreDe(detalle)} — cantidad ${detalle.cantidad}`;
}

function DetallesActuales({
  detalles,
  quitar,
  total,
  nombreDe,
  onAlternar,
}: {
  detalles: DetalleComandaSalida[];
  quitar: number[];
  total: number;
  nombreDe: NombreDe;
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
                aria-label={`Quitar ${descripcionDetalle(detalle, nombreDe)}`}
                checked={typeof detalleId === 'number' && quitar.includes(detalleId)}
                disabled={typeof detalleId !== 'number'}
                onChange={() => {
                  if (typeof detalleId === 'number') onAlternar(detalleId);
                }}
              />
              <span>{descripcionDetalle(detalle, nombreDe)}</span>
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
  productos,
  menus,
  onAgregar,
  onCambiar,
  onQuitar,
}: {
  lineas: LineaPedido[];
  productos: ProductoSeleccionable[];
  menus: MenuEjecutivoSeleccionable[];
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
          productos={productos}
          menus={menus}
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

function CuerpoModificar({
  mod,
  catalogo,
}: {
  mod: ReturnType<typeof useModificacionComanda>;
  catalogo: ReturnType<typeof useCatalogoComanda>;
}) {
  return (
    <>
      <DetallesActuales
        detalles={mod.detalles}
        quitar={mod.quitar}
        total={mod.total}
        nombreDe={catalogo.nombreDe}
        onAlternar={mod.alternar}
      />
      <NuevasLineas
        lineas={mod.nuevas}
        productos={catalogo.productos}
        menus={catalogo.menus}
        onAgregar={mod.agregar}
        onCambiar={mod.cambiar}
        onQuitar={mod.quitarLinea}
      />
    </>
  );
}

export function ModificarComandaDialog({ id, onSalir, onModificada }: Props) {
  const { comanda, setComanda, error: errorCarga } = useComandaParaModificar(id);
  const catalogo = useCatalogoComanda();
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
        {mod.error && <p role="alert">{mod.error}</p>}
        {mod.aviso && <p role="status">{mod.aviso}</p>}
        {comanda && <CuerpoModificar mod={mod} catalogo={catalogo} />}
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
