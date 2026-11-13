import { useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Users } from 'lucide-react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { FormField } from '../../../shared/components/ui/form-field';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Select } from '../../../shared/components/ui/select';
import { Spinner } from '../../../shared/components/ui/spinner';
import { Textarea } from '../../../shared/components/ui/textarea';
import { etiquetaMesa, etiquetaMozo } from './catalogoComanda';
import { DetallePedidoFila } from './DetallePedidoFila';
import { useCatalogoComanda, useMozosHabilitados } from './useCatalogoComanda';
import { usePedido } from './usePedido';
import type { MozoSeleccionable } from '../types';

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
      <Button type="button" variant="outline" onClick={pedido.agregar}>
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

interface CampoMozoProps {
  mozoId: string;
  texto: string;
  mozos: MozoSeleccionable[];
  cargando: boolean;
  error: string | null;
  onTexto: (texto: string) => void;
  onSeleccionar: (mozo: MozoSeleccionable) => void;
  onReintentar: () => void;
}

function CampoMozo(props: CampoMozoProps) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="space-y-3">
      <EntradaMozo {...props} abierto={abierto} setAbierto={setAbierto} />
      <EstadoBusquedaMozo {...props} />
    </div>
  );
}

function EntradaMozo({
  mozoId,
  texto,
  mozos,
  onTexto,
  onSeleccionar,
  abierto,
  setAbierto,
}: CampoMozoProps & { abierto: boolean; setAbierto: (abierto: boolean) => void }) {
  const mostrarOpciones = abierto && mozos.length > 0;
  return (
    <FormField id="comanda-mozo" label="Mozo" required>
      <div className="relative" onBlur={(event) => cerrarAlPerderFoco(event, setAbierto)}>
        <SearchInput
          id="comanda-mozo"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="comanda-mozos-opciones"
          aria-expanded={mostrarOpciones}
          autoComplete="off"
          required
          placeholder="Buscar por nombre o apellido"
          value={texto}
          onFocus={() => setAbierto(true)}
          onChange={(event) => {
            onTexto(event.target.value);
            setAbierto(true);
          }}
          onKeyDown={(event) => manejarTeclaMozo(event, mozos, onSeleccionar, setAbierto)}
          onLimpiar={() => onTexto('')}
        />
        {mostrarOpciones && (
          <ListaMozos
            mozos={mozos}
            mozoId={mozoId}
            onSeleccionar={(mozo) => {
              onSeleccionar(mozo);
              setAbierto(false);
            }}
          />
        )}
      </div>
    </FormField>
  );
}

function cerrarAlPerderFoco(
  event: FocusEvent<HTMLDivElement>,
  setAbierto: (abierto: boolean) => void,
) {
  const destino = event.relatedTarget;
  if (!(destino instanceof Node) || !event.currentTarget.contains(destino)) setAbierto(false);
}

function EstadoBusquedaMozo({ cargando, error, mozos, texto, onReintentar }: CampoMozoProps) {
  if (cargando) return <Spinner etiqueta="Buscando mozos habilitados…" />;
  if (error) {
    return (
      <ErrorState
        titulo="No se pudieron cargar los mozos"
        descripcion={error}
        onReintentar={onReintentar}
      />
    );
  }
  if (mozos.length > 0) return null;
  return (
    <EmptyState
      icono={Users}
      titulo={texto.trim() ? 'Sin coincidencias' : 'No hay mozos habilitados'}
      descripcion={
        texto.trim()
          ? 'Probá con otro nombre o apellido.'
          : 'No se puede abrir una comanda sin seleccionar un mozo habilitado.'
      }
    />
  );
}

function ListaMozos({
  mozos,
  mozoId,
  onSeleccionar,
}: {
  mozos: MozoSeleccionable[];
  mozoId: string;
  onSeleccionar: (mozo: MozoSeleccionable) => void;
}) {
  return (
    <div
      id="comanda-mozos-opciones"
      role="listbox"
      className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
    >
      {mozos.map((mozo) => (
        <Button
          key={mozo.id}
          type="button"
          role="option"
          aria-selected={mozoId === String(mozo.id)}
          variant="ghost"
          className="w-full justify-start"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSeleccionar(mozo)}
        >
          {etiquetaMozo(mozo)}
        </Button>
      ))}
    </div>
  );
}

function manejarTeclaMozo(
  event: KeyboardEvent<HTMLInputElement>,
  mozos: MozoSeleccionable[],
  onSeleccionar: (mozo: MozoSeleccionable) => void,
  setAbierto: (abierto: boolean) => void,
) {
  if (event.key === 'Escape') setAbierto(false);
  if (event.key === 'ArrowDown') setAbierto(true);
  if (event.key === 'Enter' && mozos[0]) {
    event.preventDefault();
    onSeleccionar(mozos[0]);
    setAbierto(false);
  }
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

function useCampoMozo(pedido: Pedido): CampoMozoProps {
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const catalogo = useMozosHabilitados(busqueda);
  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    setBusqueda(nuevo);
    pedido.setMozoId('');
  }
  function seleccionar(mozo: MozoSeleccionable) {
    setTexto(etiquetaMozo(mozo));
    pedido.setMozoId(String(mozo.id));
  }
  return {
    mozoId: pedido.mozoId,
    texto,
    mozos: catalogo.mozos,
    cargando: catalogo.cargando,
    error: catalogo.error,
    onTexto: cambiarTexto,
    onSeleccionar: seleccionar,
    onReintentar: catalogo.recargar,
  };
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
}: {
  onCreada: () => void;
  mesaInicial?: string;
}) {
  const catalogo = useCatalogoComanda({ conMesas: true });
  const pedido = usePedido(onCreada, mesaInicial, catalogo.mesasLibres);
  const campoMozo = useCampoMozo(pedido);
  const bloqueado = estaBloqueado(pedido, catalogo, campoMozo);
  return (
    <form onSubmit={(e) => void pedido.enviar(e)} className="space-y-4">
      <p>El precio se calcula en el servidor.</p>
      {catalogo.error && <Alert variant="danger">{catalogo.error}</Alert>}
      {catalogo.cargando && <Spinner etiqueta="Cargando el catálogo de comandas…" />}
      <CamposPedido pedido={pedido} catalogo={catalogo} campoMozo={campoMozo} />
      {pedido.error && <p role="alert">{pedido.error}</p>}
      <Button type="submit" disabled={bloqueado}>
        Guardar comanda
      </Button>
    </form>
  );
}
