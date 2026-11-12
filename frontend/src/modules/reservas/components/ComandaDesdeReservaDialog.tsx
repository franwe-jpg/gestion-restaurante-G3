import { Plus, Trash2, Users } from 'lucide-react';
import type { FocusEvent, FormEvent, KeyboardEvent } from 'react';
import { useState } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Dialog } from '../../../shared/components/ui/dialog';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Spinner } from '../../../shared/components/ui/spinner';

import type { MozoSeleccionable, Reserva } from '../types';

import { useComandaDesdeReserva } from './useComandaDesdeReserva';
import type { CampoLinea } from './useComandaDesdeReserva';
import { useMozosDisponibles } from './useMozosDisponibles';
import type { ErroresDeLinea, LineaEscrita } from './validarComandaDesdeReserva';

export interface ComandaDesdeReservaDialogProps {
  /** La reserva `ACTIVA` cuya comanda se crea; su mesa se muestra y no se puede cambiar. */
  reserva: Reserva;
  /** Se llama con la comanda ya creada: la página cierra el modal y vuelve a pedir el listado. */
  onCreada: () => void;
  onOpenChange: (abierto: boolean) => void;
}

const ID_FORMULARIO_COMANDA = 'formulario-comanda-desde-reserva';

interface LineaProductoProps {
  linea: LineaEscrita;
  /** Posición de la línea, desde 1: numera las etiquetas y los nombres de las acciones. */
  numero: number;
  errores?: ErroresDeLinea;
  puedeQuitarse: boolean;
  onCambiar: (campo: CampoLinea, valor: string) => void;
  onQuitar: () => void;
}

/** Una línea del pedido: producto por su número (ID), cantidad y la acción de quitarla. */
function LineaProducto({
  linea,
  numero,
  errores,
  puedeQuitarse,
  onCambiar,
  onQuitar,
}: LineaProductoProps) {
  const idProducto = `comanda-producto-${linea.clave}`;
  const idCantidad = `comanda-cantidad-${linea.clave}`;
  return (
    <div className="grid grid-cols-[1fr_7rem_auto] items-start gap-3">
      <FormField id={idProducto} label={`Producto ${numero} (ID)`} error={errores?.producto}>
        <Input
          id={idProducto}
          inputMode="numeric"
          value={linea.producto}
          onChange={(evento) => onCambiar('producto', evento.target.value)}
        />
      </FormField>
      <FormField id={idCantidad} label={`Cantidad ${numero}`} error={errores?.cantidad}>
        <Input
          id={idCantidad}
          inputMode="numeric"
          value={linea.cantidad}
          onChange={(evento) => onCambiar('cantidad', evento.target.value)}
        />
      </FormField>
      <Button
        variant="ghost"
        size="sm"
        className="mt-6"
        aria-label={`Quitar producto ${numero}`}
        disabled={!puedeQuitarse}
        onClick={onQuitar}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

type Comanda = ReturnType<typeof useComandaDesdeReserva>;

interface FormularioComandaProps {
  reserva: Reserva;
  comanda: Comanda;
  catalogoMozos: ReturnType<typeof useMozosDisponibles>;
}

type CatalogoMozos = ReturnType<typeof useMozosDisponibles>;

interface CampoMozoProps {
  comanda: Comanda;
  catalogo: CatalogoMozos;
}

interface EstadoCampoMozo {
  texto: string;
  opciones: MozoSeleccionable[];
  mostrarOpciones: boolean;
  cambiarTexto: (texto: string) => void;
  limpiar: () => void;
  abrir: () => void;
  manejarTecla: (evento: KeyboardEvent<HTMLInputElement>) => void;
  cerrar: (evento: FocusEvent<HTMLDivElement>) => void;
  seleccionar: (mozo: MozoSeleccionable) => void;
}

function CampoMozo({ comanda, catalogo }: CampoMozoProps) {
  const estado = useEstadoCampoMozo(comanda, catalogo);
  return (
    <div className="space-y-3">
      <EntradaMozo comanda={comanda} catalogo={catalogo} estado={estado} />
      <EstadoCatalogoMozos catalogo={catalogo} />
    </div>
  );
}

function useEstadoCampoMozo(comanda: Comanda, catalogo: CatalogoMozos): EstadoCampoMozo {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const opciones = catalogo.mozos.filter((mozo) => coincideMozo(mozo, texto));
  const cambiarTexto = (nuevoTexto: string) => {
    setTexto(nuevoTexto);
    comanda.elegirMozo('');
    setAbierto(true);
  };
  const seleccionar = (mozo: MozoSeleccionable) => {
    comanda.elegirMozo(String(mozo.id));
    setTexto(`${mozo.nombre} ${mozo.apellido}`);
    setAbierto(false);
  };
  const manejarTecla = (evento: KeyboardEvent<HTMLInputElement>) =>
    elegirConTeclado(evento, opciones, comanda, setAbierto, setTexto);
  return {
    texto,
    opciones,
    mostrarOpciones: abierto && opciones.length > 0,
    cambiarTexto,
    limpiar: () => {
      setTexto('');
      comanda.elegirMozo('');
    },
    abrir: () => setAbierto(true),
    manejarTecla,
    cerrar: (evento) => cerrarOpciones(evento, setAbierto),
    seleccionar,
  };
}

function EntradaMozo({
  comanda,
  catalogo,
  estado,
}: CampoMozoProps & { estado: EstadoCampoMozo }) {
  return (
    <FormField id="comanda-mozo" label="Mozo" required error={comanda.errores.mozo}>
      <div className="relative" onBlur={estado.cerrar}>
        <SearchInput
          id="comanda-mozo"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="comanda-mozos-opciones"
          aria-expanded={estado.mostrarOpciones}
          aria-invalid={Boolean(comanda.errores.mozo)}
          aria-describedby={comanda.errores.mozo ? 'comanda-mozo-error' : undefined}
          autoComplete="off"
          required
          disabled={catalogo.cargando || catalogo.error !== null || catalogo.mozos.length === 0}
          placeholder="Buscar mozo por nombre o apellido"
          value={estado.texto}
          onFocus={estado.abrir}
          onChange={(evento) => estado.cambiarTexto(evento.target.value)}
          onKeyDown={estado.manejarTecla}
          onLimpiar={estado.limpiar}
        />
        <OpcionesMozos estado={estado} mozoId={comanda.mozoId} />
        <MensajeSinCoincidencias estado={estado} catalogo={catalogo} />
      </div>
    </FormField>
  );
}

function OpcionesMozos({
  estado,
  mozoId,
}: {
  estado: EstadoCampoMozo;
  mozoId: string;
}) {
  if (!estado.mostrarOpciones) return null;
  return (
    <ListaMozos mozos={estado.opciones} mozoId={mozoId} onSeleccionar={estado.seleccionar} />
  );
}

function MensajeSinCoincidencias({
  estado,
  catalogo,
}: {
  estado: EstadoCampoMozo;
  catalogo: CatalogoMozos;
}) {
  const sinCoincidencias =
    !catalogo.cargando &&
    !catalogo.error &&
    estado.texto.trim() !== '' &&
    catalogo.mozos.length > 0 &&
    estado.opciones.length === 0;
  if (!sinCoincidencias) return null;
  return (
    <p role="status" className="mt-2 text-sm text-slate-500">
      No hay mozos que coincidan con la búsqueda.
    </p>
  );
}

function EstadoCatalogoMozos({ catalogo }: { catalogo: CatalogoMozos }) {
  if (catalogo.cargando) return <Spinner etiqueta="Cargando mozos habilitados…" />;
  if (catalogo.error) {
    return (
      <ErrorState
        titulo="No se pudieron cargar los mozos"
        descripcion={catalogo.error}
        onReintentar={catalogo.recargar}
      />
    );
  }
  if (catalogo.mozos.length > 0) return null;
  return (
    <EmptyState
      icono={Users}
      titulo="No hay mozos habilitados"
      descripcion="No se puede abrir una comanda sin seleccionar un mozo habilitado."
    />
  );
}

function coincideMozo(mozo: MozoSeleccionable, texto: string) {
  const busqueda = normalizarTexto(texto);
  return normalizarTexto(`${mozo.nombre} ${mozo.apellido}`).includes(busqueda);
}

function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function cerrarOpciones(
  evento: FocusEvent<HTMLDivElement>,
  setAbierto: (abierto: boolean) => void,
) {
  const destino = evento.relatedTarget;
  if (!(destino instanceof Node) || !evento.currentTarget.contains(destino)) setAbierto(false);
}

function elegirConTeclado(
  evento: KeyboardEvent<HTMLInputElement>,
  opciones: MozoSeleccionable[],
  comanda: Comanda,
  setAbierto: (abierto: boolean) => void,
  setTexto: (texto: string) => void,
) {
  if (evento.key === 'Escape') setAbierto(false);
  if (evento.key === 'ArrowDown') setAbierto(true);
  if (evento.key === 'Enter' && opciones[0]) {
    evento.preventDefault();
    comanda.elegirMozo(String(opciones[0].id));
    setTexto(`${opciones[0].nombre} ${opciones[0].apellido}`);
    setAbierto(false);
  }
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
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => onSeleccionar(mozo)}
        >
          {mozo.nombre} {mozo.apellido}
        </Button>
      ))}
    </div>
  );
}

function FormularioComanda({ reserva, comanda, catalogoMozos }: FormularioComandaProps) {
  const { lineas, errores } = comanda;

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void comanda.enviar();
  };

  return (
    <form id={ID_FORMULARIO_COMANDA} noValidate onSubmit={alEnviar} className="space-y-4">
      {errores.general && (
        <Alert variant="danger" titulo="No se pudo crear la comanda">
          {errores.general}
        </Alert>
      )}
      <FormField id="comanda-mesa" label="Mesa">
        <Input id="comanda-mesa" value={`Mesa n.º ${reserva.mesa_id}`} disabled />
      </FormField>
      <CampoMozo comanda={comanda} catalogo={catalogoMozos} />
      {lineas.map((linea, indice) => (
        <LineaProducto
          key={linea.clave}
          linea={linea}
          numero={indice + 1}
          errores={errores.lineas[linea.clave]}
          puedeQuitarse={lineas.length > 1}
          onCambiar={(campo, valor) => comanda.cambiarLinea(linea.clave, campo, valor)}
          onQuitar={() => comanda.quitarLinea(linea.clave)}
        />
      ))}
      <Button variant="outline" size="sm" onClick={() => comanda.agregarLinea()}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar producto
      </Button>
    </form>
  );
}

/**
 * HU-M5-06: modal «Crear comanda» de una reserva `ACTIVA`. La mesa sale de la reserva (solo
 * lectura, no se envía) y el pedido son líneas de producto por su número. Se monta solo mientras
 * debe verse: la página decide si se muestra, con una clave por reserva para que arranque limpio.
 */
export function ComandaDesdeReservaDialog({
  reserva,
  onCreada,
  onOpenChange,
}: ComandaDesdeReservaDialogProps) {
  const comanda = useComandaDesdeReserva({ reserva, onCreada });
  const catalogoMozos = useMozosDisponibles();
  const guardarDeshabilitado =
    comanda.enviando ||
    catalogoMozos.cargando ||
    catalogoMozos.error !== null ||
    catalogoMozos.mozos.length === 0 ||
    comanda.mozoId === '';

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Crear comanda"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form={ID_FORMULARIO_COMANDA} disabled={guardarDeshabilitado}>
            Guardar comanda
          </Button>
        </>
      }
    >
      <FormularioComanda reserva={reserva} comanda={comanda} catalogoMozos={catalogoMozos} />
    </Dialog>
  );
}
