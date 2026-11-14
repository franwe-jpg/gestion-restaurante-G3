import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import type { DetalleEntrega, EntregasComanda } from '../types';
import { unidadesDeLinea, type UnidadesDeLinea } from './unidadesDeLinea';
import { useCatalogoComanda } from './useCatalogoComanda';
import { useEntregas } from './useEntregas';

interface Props {
  id: number;
  /** Muestra los botones para registrar entregas (permiso COMANDAS_OPERAR). */
  puedeEntregar: boolean;
  /** Muestra los botones para marcar unidades listas en cocina (COMANDAS_MARCAR_LISTO). */
  puedeMarcarListo: boolean;
  onSalir: () => void;
}

type Etiqueta = 'Entregado' | 'Listo para servir' | 'Pendiente';

/** Con unidades listas se muestra cada estado presente; si no, solo el dominante. */
function etiquetasDeLinea({ entregadas, listas, pendientes }: UnidadesDeLinea): Etiqueta[] {
  if (listas === 0) return [pendientes === 0 ? 'Entregado' : 'Pendiente'];
  const etiquetas: Etiqueta[] = [];
  if (entregadas > 0) etiquetas.push('Entregado');
  etiquetas.push('Listo para servir');
  if (pendientes > 0) etiquetas.push('Pendiente');
  return etiquetas;
}

const VARIANTE: Record<Etiqueta, 'success' | 'info' | 'warning'> = {
  Entregado: 'success',
  'Listo para servir': 'info',
  Pendiente: 'warning',
};

function InsigniasDeLinea({ unidades }: { unidades: UnidadesDeLinea }) {
  return (
    <span className="flex gap-1">
      {etiquetasDeLinea(unidades).map((etiqueta) => (
        <Badge key={etiqueta} variant={VARIANTE[etiqueta]}>
          {etiqueta}
        </Badge>
      ))}
    </span>
  );
}

interface FilaProps {
  detalle: DetalleEntrega;
  nombre: string;
  bloqueado: boolean;
  puedeEntregar: boolean;
  puedeMarcarListo: boolean;
  onEntregar: (valor: number) => void;
  onMarcarListo: (valor: number) => void;
}

function EntregaFila({
  detalle,
  nombre,
  bloqueado,
  puedeEntregar,
  puedeMarcarListo,
  onEntregar,
  onMarcarListo,
}: FilaProps) {
  const { cantidad, cantidad_entregada: entregadas } = detalle;
  const unidades = unidadesDeLinea(detalle);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
      <span className="font-medium">{nombre}</span>
      <span>
        {entregadas} de {cantidad}
      </span>
      <span>Listas para servir: {unidades.listas}</span>
      <InsigniasDeLinea unidades={unidades} />
      {puedeMarcarListo && (
        <BotonesDeListo
          nombre={nombre}
          cantidad={cantidad}
          unidades={unidades}
          bloqueado={bloqueado}
          onCambiar={onMarcarListo}
        />
      )}
      {puedeEntregar && (
        <BotonesDeEntrega
          nombre={nombre}
          entregadas={entregadas}
          cantidad={cantidad}
          bloqueado={bloqueado}
          onCambiar={onEntregar}
        />
      )}
    </li>
  );
}

function BotonesDeListo({
  nombre,
  cantidad,
  unidades,
  bloqueado,
  onCambiar,
}: {
  nombre: string;
  cantidad: number;
  unidades: UnidadesDeLinea;
  bloqueado: boolean;
  onCambiar: (valor: number) => void;
}) {
  const { entregadas, listas, pendientes } = unidades;
  return (
    <span className="flex items-center gap-2">
      <Button
        variant="brand-outline"
        aria-label={`Quitar una unidad lista de ${nombre}`}
        disabled={bloqueado || listas === 0}
        onClick={() => onCambiar(entregadas + listas - 1)}
      >
        −
      </Button>
      <Button
        variant="brand-outline"
        aria-label={`Marcar una unidad lista de ${nombre}`}
        disabled={bloqueado || pendientes === 0}
        onClick={() => onCambiar(entregadas + listas + 1)}
      >
        +
      </Button>
      <Button
        variant="brand-outline"
        aria-label={`Marcar todo listo de ${nombre}`}
        disabled={bloqueado || pendientes === 0}
        onClick={() => onCambiar(cantidad)}
      >
        Todo listo
      </Button>
    </span>
  );
}

function BotonesDeEntrega({
  nombre,
  entregadas,
  cantidad,
  bloqueado,
  onCambiar,
}: {
  nombre: string;
  entregadas: number;
  cantidad: number;
  bloqueado: boolean;
  onCambiar: (valor: number) => void;
}) {
  return (
    <span className="flex items-center gap-2">
      <Button
        variant="brand-outline"
        aria-label={`Restar una unidad de ${nombre}`}
        disabled={bloqueado || entregadas === 0}
        onClick={() => onCambiar(entregadas - 1)}
      >
        −
      </Button>
      <Button
        variant="brand-outline"
        aria-label={`Sumar una unidad de ${nombre}`}
        disabled={bloqueado || entregadas === cantidad}
        onClick={() => onCambiar(entregadas + 1)}
      >
        +
      </Button>
      <Button
        variant="brand-outline"
        aria-label={`Entregar todo de ${nombre}`}
        disabled={bloqueado || entregadas === cantidad}
        onClick={() => onCambiar(cantidad)}
      >
        Entregar todo
      </Button>
    </span>
  );
}

function Avisos({
  datos,
  error,
  puedeCambiar,
}: {
  datos: EntregasComanda | null;
  error: string;
  puedeCambiar: boolean;
}) {
  const completa = datos !== null && datos.detalles.every((d) => d.estado_entrega === 'ENTREGADO');
  return (
    <>
      {!datos && !error && <p role="status">Cargando entregas…</p>}
      {error && <p role="alert">{error}</p>}
      {completa && <p>No falta servir nada</p>}
      {puedeCambiar && datos && datos.estado !== 'ABIERTA' && (
        <p>La comanda está {datos.estado}: no se pueden cambiar las entregas.</p>
      )}
    </>
  );
}

export function EntregasComandaDialog({ id, puedeEntregar, puedeMarcarListo, onSalir }: Props) {
  const { datos, error, enviando, registrar, marcarListo } = useEntregas(id);
  const { nombreDe } = useCatalogoComanda();
  const bloqueado = enviando || datos?.estado !== 'ABIERTA';
  return (
    <Dialog
      open
      size="lg"
      title={`${puedeEntregar ? 'Entregas' : 'Detalle'} de la comanda #${id}`}
      onOpenChange={(abierto) => {
        if (!abierto) onSalir();
      }}
    >
      <div className="space-y-4">
        <Avisos datos={datos} error={error} puedeCambiar={puedeEntregar || puedeMarcarListo} />
        {datos && (
          <ul className="space-y-2">
            {datos.detalles.map((detalle) => (
              <EntregaFila
                key={detalle.id}
                detalle={detalle}
                nombre={nombreDe(detalle)}
                bloqueado={bloqueado}
                puedeEntregar={puedeEntregar}
                puedeMarcarListo={puedeMarcarListo}
                onEntregar={(valor) => void registrar(detalle.id, valor)}
                onMarcarListo={(valor) => void marcarListo(detalle.id, valor)}
              />
            ))}
          </ul>
        )}
        <Button variant="brand-outline" onClick={onSalir}>
          Volver
        </Button>
      </div>
    </Dialog>
  );
}
