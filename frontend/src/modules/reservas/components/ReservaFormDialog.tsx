import type { FormEvent } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import type { Reserva } from '../types';

import { useFormularioReserva } from './useFormularioReserva';
import { SelectorMesa } from './SelectorMesa';
import type { DatosFormularioReserva } from './validarReserva';

export interface ReservaFormDialogProps {
  /** Con `reserva` el modal modifica esa fila; sin ella da de alta una reserva nueva. */
  reserva?: Reserva;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

const ID_FORMULARIO_RESERVA = 'formulario-reserva';

type Formulario = ReturnType<typeof useFormularioReserva>;

interface CampoReservaProps {
  formulario: Formulario;
  campo: keyof DatosFormularioReserva;
  etiqueta: string;
  /** Sin `tipo` el campo es numérico: cliente, cantidad y la mesa de solo lectura de la edición (S13). */
  tipo?: 'date' | 'time';
  deshabilitado?: boolean;
}

function CampoReserva({ formulario, campo, etiqueta, tipo, deshabilitado }: CampoReservaProps) {
  const id = `reserva-${campo}`;
  return (
    <FormField id={id} label={etiqueta} required error={formulario.errores[campo]}>
      <Input
        id={id}
        type={tipo}
        inputMode={tipo ? undefined : 'numeric'}
        value={formulario.datos[campo]}
        disabled={deshabilitado}
        onChange={(evento) => formulario.cambiar(campo, evento.target.value)}
      />
    </FormField>
  );
}

/**
 * En el alta Mesa se elige entre las mesas disponibles para la fecha y la hora; en la edición no
 * cambia: sigue siendo un campo de solo lectura con el `mesa_id` de la fila y no pide la lista.
 */
function CampoMesa({ formulario, edicion }: { formulario: Formulario; edicion: boolean }) {
  if (edicion) {
    return (
      <CampoReserva formulario={formulario} campo="mesa" etiqueta="Mesa (número)" deshabilitado />
    );
  }
  return (
    <SelectorMesa
      estado={formulario.estadoMesas}
      valor={formulario.mesaVigente}
      error={formulario.errores.mesa}
      onCambiar={(mesa) => formulario.cambiar('mesa', mesa)}
    />
  );
}

/**
 * Se monta solo mientras debe verse un modal: la página decide si se muestra. El alta parte de
 * campos vacíos y la edición, de los datos de la fila. En la edición Cliente y Mesa no se pueden
 * cambiar.
 */
export function ReservaFormDialog({ reserva, onGuardado, onOpenChange }: ReservaFormDialogProps) {
  const formulario = useFormularioReserva({ reserva, onGuardado });
  const { errores } = formulario;
  const edicion = reserva !== undefined;

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void formulario.enviar();
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={edicion ? 'Modificar reserva' : 'Nueva reserva'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={ID_FORMULARIO_RESERVA}
            disabled={formulario.guardarDeshabilitado}
          >
            Guardar reserva
          </Button>
        </>
      }
    >
      <form id={ID_FORMULARIO_RESERVA} noValidate onSubmit={alEnviar} className="space-y-4">
        {errores.general && <Alert variant="danger">{errores.general}</Alert>}
        <CampoReserva
          formulario={formulario}
          campo="cliente"
          etiqueta="Cliente (número)"
          deshabilitado={edicion}
        />
        <div className="grid grid-cols-2 gap-3">
          <CampoReserva formulario={formulario} campo="fecha" etiqueta="Fecha" tipo="date" />
          <CampoReserva formulario={formulario} campo="hora" etiqueta="Hora" tipo="time" />
        </div>
        <CampoReserva formulario={formulario} campo="cantidad" etiqueta="Cantidad de personas" />
        <CampoMesa formulario={formulario} edicion={edicion} />
      </form>
    </Dialog>
  );
}
