import { X } from 'lucide-react';
import type { FormEvent } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import { useFormularioReserva } from './useFormularioReserva';
import type { DatosFormularioReserva } from './validarReserva';

export interface ReservaFormularioProps {
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
}

function CampoReserva({ formulario, campo, etiqueta, tipo }: CampoReservaProps) {
  const id = `reserva-${campo}`;
  return (
    <FormField id={id} label={etiqueta} required error={formulario.errores[campo]}>
      <Input
        id={id}
        type={tipo}
        inputMode={tipo ? undefined : 'numeric'}
        value={formulario.datos[campo]}
        onChange={(evento) => formulario.cambiar(campo, evento.target.value)}
      />
    </FormField>
  );
}

function CabeceraDelPanel({ onCerrar }: { onCerrar: () => void }) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle id="titulo-reserva">Nueva reserva</CardTitle>
      <Button variant="ghost" size="sm" aria-label="Cerrar formulario" onClick={onCerrar}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </CardHeader>
  );
}

/** Panel lateral de alta: se monta al abrirlo y parte siempre de campos vacíos. */
export function ReservaFormulario({ onCerrar, onGuardado }: ReservaFormularioProps) {
  const formulario = useFormularioReserva({ onGuardado });
  const { errores } = formulario;

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void formulario.enviar();
  };

  return (
    <Card>
      <form aria-labelledby="titulo-reserva" noValidate onSubmit={alEnviar}>
        <CabeceraDelPanel onCerrar={onCerrar} />
        <CardContent className="space-y-4">
          {errores.general && <Alert variant="danger">{errores.general}</Alert>}
          <CampoReserva formulario={formulario} campo="cliente" etiqueta="Cliente (número)" />
          <div className="grid grid-cols-2 gap-3">
            <CampoReserva formulario={formulario} campo="fecha" etiqueta="Fecha" tipo="date" />
            <CampoReserva formulario={formulario} campo="hora" etiqueta="Hora" tipo="time" />
          </div>
          <CampoReserva formulario={formulario} campo="cantidad" etiqueta="Cantidad de personas" />
          <CampoReserva formulario={formulario} campo="mesa" etiqueta="Mesa (número)" />
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
