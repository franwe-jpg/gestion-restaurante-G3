import { X } from 'lucide-react';
import type { FormEvent } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import type { Reserva } from '../types';

import { useFormularioReserva } from './useFormularioReserva';
import type { DatosFormularioReserva } from './validarReserva';

export interface ReservaFormularioProps {
  /** Con `reserva` el panel modifica esa fila; sin ella da de alta una reserva nueva. */
  reserva?: Reserva;
  onCerrar: () => void;
  onGuardado: () => void;
}

type Formulario = ReturnType<typeof useFormularioReserva>;

interface CampoReservaProps {
  formulario: Formulario;
  campo: keyof DatosFormularioReserva;
  etiqueta: string;
  /** Sin `tipo` el campo es numérico: cliente, mesa y cantidad (S13). */
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

function CabeceraDelPanel({ titulo, onCerrar }: { titulo: string; onCerrar: () => void }) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle id="titulo-reserva">{titulo}</CardTitle>
      <Button variant="ghost" size="sm" aria-label="Cerrar formulario" onClick={onCerrar}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </CardHeader>
  );
}

/**
 * Panel lateral de alta y de edición. Se monta al abrirlo: el alta parte de campos vacíos y la
 * edición, de los datos de la fila. En la edición Cliente y Mesa no se pueden cambiar.
 */
export function ReservaFormulario({ reserva, onCerrar, onGuardado }: ReservaFormularioProps) {
  const formulario = useFormularioReserva({ reserva, onGuardado });
  const { errores } = formulario;
  const edicion = reserva !== undefined;

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void formulario.enviar();
  };

  return (
    <Card>
      <form aria-labelledby="titulo-reserva" noValidate onSubmit={alEnviar}>
        <CabeceraDelPanel
          titulo={edicion ? 'Modificar reserva' : 'Nueva reserva'}
          onCerrar={onCerrar}
        />
        <CardContent className="space-y-4">
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
          <CampoReserva
            formulario={formulario}
            campo="mesa"
            etiqueta="Mesa (número)"
            deshabilitado={edicion}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formulario.enviando}>
              Guardar reserva
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
