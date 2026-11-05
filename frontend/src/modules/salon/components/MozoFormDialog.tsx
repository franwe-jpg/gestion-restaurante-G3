import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import type { Mozo } from '../types';

import { useFormularioMozo } from './useFormularioMozo';

export interface MozoFormDialogProps {
  mozo?: Mozo | null;
  onGuardado: () => void;
  onOpenChange: (abierto: boolean) => void;
}

type Formulario = ReturnType<typeof useFormularioMozo>;

function estadoDelMozo(mozo: Mozo | null): string {
  return mozo?.estado === 'DESHABILITADO' ? 'Deshabilitado' : 'Habilitado';
}

function CampoDni({ formulario }: { formulario: Formulario }) {
  return (
    <FormField
      id="mozo-dni"
      label="DNI"
      required
      hint="7 u 8 dígitos, sin puntos."
      error={formulario.errores.dni}
    >
      <Input
        id="mozo-dni"
        inputMode="numeric"
        value={formulario.dni}
        onChange={(evento) => formulario.setDni(evento.target.value)}
      />
    </FormField>
  );
}

function CamposNombre({ formulario }: { formulario: Formulario }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="mozo-nombre" label="Nombre" required error={formulario.errores.nombre}>
        <Input
          id="mozo-nombre"
          value={formulario.nombre}
          onChange={(evento) => formulario.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="mozo-apellido" label="Apellido" required error={formulario.errores.apellido}>
        <Input
          id="mozo-apellido"
          value={formulario.apellido}
          onChange={(evento) => formulario.setApellido(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function CampoTelefono({ formulario }: { formulario: Formulario }) {
  return (
    <FormField
      id="mozo-telefono"
      label="Teléfono"
      hint="Opcional."
      error={formulario.errores.telefono}
    >
      <Input
        id="mozo-telefono"
        value={formulario.telefono}
        onChange={(evento) => formulario.setTelefono(evento.target.value)}
      />
    </FormField>
  );
}

function AvisoEstado({ mozo }: { mozo: Mozo | null }) {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
      {mozo === null ? (
        <>
          El mozo se crea en estado <strong>Habilitado</strong>.
        </>
      ) : (
        <>Estado: {estadoDelMozo(mozo)}</>
      )}
    </p>
  );
}

function CamposMozo({ formulario, mozo }: { formulario: Formulario; mozo: Mozo | null }) {
  return (
    <div className="space-y-4">
      {formulario.errores.general && <Alert variant="danger">{formulario.errores.general}</Alert>}
      <CampoDni formulario={formulario} />
      <CamposNombre formulario={formulario} />
      <CampoTelefono formulario={formulario} />
      <AvisoEstado mozo={mozo} />
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de los datos del mozo o vacía. */
export function MozoFormDialog({ mozo = null, onGuardado, onOpenChange }: MozoFormDialogProps) {
  const formulario = useFormularioMozo({ mozo, onGuardado });
  const esEdicion = mozo !== null;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={esEdicion ? 'Editar mozo' : 'Nuevo mozo'}
      description="El estado del mozo lo asigna el sistema."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void formulario.enviar()} disabled={formulario.enviando}>
            {esEdicion ? 'Guardar cambios' : 'Guardar mozo'}
          </Button>
        </>
      }
    >
      <CamposMozo formulario={formulario} mozo={mozo} />
    </Dialog>
  );
}
