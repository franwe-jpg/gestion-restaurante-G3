import { useEffect, useState } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import { Spinner } from '../../../shared/components/ui/spinner';
import { Textarea } from '../../../shared/components/ui/textarea';
import { CampoMozo } from './CampoMozo';
import type { CampoMozoProps } from './CampoMozo';
import { etiquetaMesa } from './catalogoComanda';
import { DetallePedidoFila } from './DetallePedidoFila';
import { useCatalogoComanda } from './useCatalogoComanda';
import { useCampoMozo } from './useCampoMozo';
import { usePedido } from './usePedido';

export const ID_FORMULARIO_COMANDA = 'formulario-comanda';

type Pedido = ReturnType<typeof usePedido>;
type Catalogo = ReturnType<typeof useCatalogoComanda>;

function LineasPedido({ pedido, catalogo }: { pedido: Pedido; catalogo: Catalogo }) {
  return (
    <>
      {pedido.lineas.map((linea, i) => (
        <DetallePedidoFila
          key={linea.clave}
          linea={linea}
          numero={i + 1}
          puedeQuitar={pedido.lineas.length > 1}
          productos={catalogo.productos}
          menus={catalogo.menus}
          onChange={pedido.cambiar}
          onQuitar={() => pedido.quitar(linea.clave)}
        />
      ))}
      <Button type="button" variant="brand-outline" onClick={pedido.agregar}>
        Agregar línea
      </Button>
    </>
  );
}

function CampoMesa({ pedido, catalogo }: { pedido: Pedido; catalogo: Catalogo }) {
  const { mesasLibres } = catalogo;
  return (
    <FormField id="comanda-mesa" label="Mesa">
      <Select
        id="comanda-mesa"
        value={pedido.mesa}
        onChange={(e) => pedido.setMesa(e.target.value)}
      >
        {mesasLibres.length === 0 ? (
          <option value="">{catalogo.cargando ? 'Cargando mesas…' : 'No hay mesas libres'}</option>
        ) : (
          <>
            <option value="">Seleccioná una mesa</option>
            {mesasLibres.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {etiquetaMesa(m)}
              </option>
            ))}
          </>
        )}
      </Select>
    </FormField>
  );
}

function CamposPedido({
  pedido,
  catalogo,
  campoMozo,
}: {
  pedido: Pedido;
  catalogo: Catalogo;
  campoMozo: CampoMozoProps;
}) {
  return (
    <fieldset
      disabled={pedido.guardando || catalogo.cargando || catalogo.error !== null}
      className="space-y-3"
    >
      <CampoMesa pedido={pedido} catalogo={catalogo} />
      <CampoMozo {...campoMozo} />
      <LineasPedido pedido={pedido} catalogo={catalogo} />
      <FormField id="comanda-observaciones" label="Observaciones">
        <Textarea
          id="comanda-observaciones"
          maxLength={500}
          value={pedido.observaciones}
          onChange={(e) => pedido.setObservaciones(e.target.value)}
        />
      </FormField>
    </fieldset>
  );
}

function estaBloqueado(pedido: Pedido, catalogo: Catalogo, campoMozo: CampoMozoProps) {
  return (
    pedido.guardando ||
    catalogo.cargando ||
    catalogo.error !== null ||
    catalogo.mesasLibres.length === 0 ||
    campoMozo.cargando ||
    campoMozo.error !== null ||
    campoMozo.mozos.length === 0 ||
    pedido.mozoId === ''
  );
}

export function ComandaForm({
  onCreada,
  mesaInicial,
  onBloqueoChange,
}: {
  onCreada: () => void;
  mesaInicial?: string;
  /** El pie del diálogo vive en el `Dialog`; así conoce si «Guardar comanda» se habilita. */
  onBloqueoChange?: (bloqueado: boolean) => void;
}) {
  const catalogo = useCatalogoComanda({ conMesas: true });
  const pedido = usePedido(onCreada, mesaInicial, catalogo.mesasLibres);
  const campoMozo = useCampoMozo(pedido.mozoId, pedido.setMozoId);
  const bloqueado = estaBloqueado(pedido, catalogo, campoMozo);
  useEffect(() => onBloqueoChange?.(bloqueado), [bloqueado, onBloqueoChange]);
  return (
    <form id={ID_FORMULARIO_COMANDA} onSubmit={(e) => void pedido.enviar(e)} className="space-y-4">
      <p>El precio se calcula en el servidor.</p>
      {catalogo.error && <Alert variant="danger">{catalogo.error}</Alert>}
      {catalogo.cargando && <Spinner etiqueta="Cargando el catálogo de comandas…" />}
      <CamposPedido pedido={pedido} catalogo={catalogo} campoMozo={campoMozo} />
      {pedido.error && <p role="alert">{pedido.error}</p>}
    </form>
  );
}

/** Diálogo de alta: el pie con «Cancelar» y «Guardar comanda» queda siempre a la vista. */
export function ComandaFormDialog({
  onCreada,
  mesaInicial,
  onSalir,
}: {
  onCreada: () => void;
  mesaInicial?: string;
  onSalir: () => void;
}) {
  const [bloqueado, setBloqueado] = useState(true);
  return (
    <Dialog
      open
      title="Nueva comanda"
      size="lg"
      onOpenChange={(abierto) => {
        if (!abierto) onSalir();
      }}
      footer={
        <>
          <Button variant="brand-outline" onClick={onSalir}>
            Cancelar
          </Button>
          <Button type="submit" form={ID_FORMULARIO_COMANDA} disabled={bloqueado}>
            Guardar comanda
          </Button>
        </>
      }
    >
      <ComandaForm onCreada={onCreada} mesaInicial={mesaInicial} onBloqueoChange={setBloqueado} />
    </Dialog>
  );
}
