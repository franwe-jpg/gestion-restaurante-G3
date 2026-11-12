import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import type { Reserva } from '../types';

import { useComandaDesdeReserva } from './useComandaDesdeReserva';
import type { CampoLinea } from './useComandaDesdeReserva';
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
}

/** El aviso de error de la API, la mesa de solo lectura, las líneas del pedido y «Agregar producto». */
function FormularioComanda({ reserva, comanda }: FormularioComandaProps) {
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
          <Button type="submit" form={ID_FORMULARIO_COMANDA} disabled={comanda.enviando}>
            Guardar comanda
          </Button>
        </>
      }
    >
      <FormularioComanda reserva={reserva} comanda={comanda} />
    </Dialog>
  );
}
