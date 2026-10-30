import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import type { Reserva } from '../types';

import { useFormularioReserva } from './useFormularioReserva';

export interface ReservaFormDialogProps {
  reserva?: Reserva | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

type Formulario = ReturnType<typeof useFormularioReserva>;

function CamposCliente({ formulario }: { formulario: Formulario }) {
  const { errores } = formulario;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="reserva-cliente-nombre" label="Cliente" required error={errores.clienteNombre}>
        <Input
          id="reserva-cliente-nombre"
          value={formulario.clienteNombre}
          onChange={(evento) => formulario.setClienteNombre(evento.target.value)}
        />
      </FormField>
      <FormField
        id="reserva-cliente-telefono"
        label="Teléfono"
        required
        error={errores.clienteTelefono}
      >
        <Input
          id="reserva-cliente-telefono"
          value={formulario.clienteTelefono}
          onChange={(evento) => formulario.setClienteTelefono(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function CamposFechaHora({ formulario }: { formulario: Formulario }) {
  const { errores } = formulario;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="reserva-fecha" label="Fecha" required error={errores.fecha}>
        <Input
          id="reserva-fecha"
          type="date"
          value={formulario.fecha}
          onChange={(evento) => formulario.setFecha(evento.target.value)}
        />
      </FormField>
      <FormField id="reserva-hora" label="Hora" required error={errores.hora}>
        <Input
          id="reserva-hora"
          type="time"
          value={formulario.hora}
          onChange={(evento) => formulario.setHora(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function SelectorMesa({ formulario }: { formulario: Formulario }) {
  const { errores, fecha, hora, mesas, cargandoMesas, errorDeCarga } = formulario;

  if (fecha === '' || hora === '') {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        Cargá la fecha y la hora para ver las mesas disponibles.
      </p>
    );
  }
  if (errorDeCarga) return <Alert variant="danger">{errorDeCarga}</Alert>;
  if (!cargandoMesas && mesas.length === 0) {
    return (
      <Alert variant="warning" titulo="No hay mesas disponibles">
        No hay ninguna mesa libre para esa fecha y hora. Probá con otro horario.
      </Alert>
    );
  }

  return (
    <FormField
      id="reserva-mesa"
      label="Mesa"
      required
      hint="Mesas sin otra reserva en ese horario."
      error={errores.mesaId}
    >
      <Select
        id="reserva-mesa"
        value={formulario.mesaId}
        disabled={cargandoMesas}
        onChange={(evento) => formulario.setMesaId(evento.target.value)}
      >
        <option value="">{cargandoMesas ? 'Buscando mesas...' : 'Seleccione una mesa'}</option>
        {mesas.map((mesa) => (
          <option key={mesa.id} value={mesa.id}>
            {mesa.sector_nombre} · Mesa {mesa.numero} (capacidad {mesa.capacidad})
          </option>
        ))}
      </Select>
    </FormField>
  );
}

function CamposReserva({ formulario }: { formulario: Formulario }) {
  const { errores } = formulario;
  return (
    <div className="space-y-4">
      {errores.general && <Alert variant="danger">{errores.general}</Alert>}
      {!formulario.esEdicion && <CamposCliente formulario={formulario} />}
      <CamposFechaHora formulario={formulario} />
      <FormField
        id="reserva-cantidad-personas"
        label="Cantidad de personas"
        required
        error={errores.cantidadPersonas}
      >
        <Input
          id="reserva-cantidad-personas"
          inputMode="numeric"
          value={formulario.cantidadPersonas}
          onChange={(evento) => formulario.setCantidadPersonas(evento.target.value)}
        />
      </FormField>
      {!formulario.esEdicion && <SelectorMesa formulario={formulario} />}
      {!formulario.esEdicion && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          La reserva se crea en estado <strong>Activa</strong>.
        </p>
      )}
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos de la reserva o vacía. */
export function ReservaFormDialog({
  reserva = null,
  onGuardado,
  onOpenChange,
}: ReservaFormDialogProps) {
  const formulario = useFormularioReserva({ reserva, onGuardado });
  const esEdicion = reserva !== null;
  const sinMesaElegible =
    !esEdicion &&
    formulario.fecha !== '' &&
    formulario.hora !== '' &&
    !formulario.cargandoMesas &&
    formulario.mesas.length === 0;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar reserva' : 'Nueva reserva'}
      description={
        esEdicion
          ? 'El cliente y la mesa no se pueden cambiar.'
          : 'El estado de la reserva lo asigna el sistema.'
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void formulario.enviar()}
            disabled={formulario.enviando || sinMesaElegible}
          >
            {esEdicion ? 'Guardar cambios' : 'Guardar reserva'}
          </Button>
        </>
      }
    >
      <CamposReserva formulario={formulario} />
    </Dialog>
  );
}
