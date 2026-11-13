import { Alert } from '../../../shared/components/ui/alert';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import type { Persona } from '../types';

import { CamposCredenciales } from './CamposCredenciales';
import type { TipoPersona } from './tipoPersona';
import type { useFormularioPersona } from './useFormularioPersona';

type Formulario = ReturnType<typeof useFormularioPersona>;

interface CamposProps {
  formulario: Formulario;
  prefijo: TipoPersona;
}

function CampoDni({ formulario, prefijo }: CamposProps) {
  return (
    <FormField
      id={`${prefijo}-dni`}
      label="DNI"
      required
      hint="7 u 8 dígitos, sin puntos."
      error={formulario.errores.dni}
    >
      <Input
        id={`${prefijo}-dni`}
        inputMode="numeric"
        value={formulario.dni}
        onChange={(evento) => formulario.setDni(evento.target.value)}
      />
    </FormField>
  );
}

function CamposNombre({ formulario, prefijo }: CamposProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={`${prefijo}-nombre`} label="Nombre" required error={formulario.errores.nombre}>
        <Input
          id={`${prefijo}-nombre`}
          value={formulario.nombre}
          onChange={(evento) => formulario.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField
        id={`${prefijo}-apellido`}
        label="Apellido"
        required
        error={formulario.errores.apellido}
      >
        <Input
          id={`${prefijo}-apellido`}
          value={formulario.apellido}
          onChange={(evento) => formulario.setApellido(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function CampoTelefono({ formulario, prefijo }: CamposProps) {
  return (
    <FormField
      id={`${prefijo}-telefono`}
      label="Teléfono"
      hint="Opcional."
      error={formulario.errores.telefono}
    >
      <Input
        id={`${prefijo}-telefono`}
        value={formulario.telefono}
        onChange={(evento) => formulario.setTelefono(evento.target.value)}
      />
    </FormField>
  );
}

function AvisoEstado({ persona, tipo }: { persona: Persona | null; tipo: TipoPersona }) {
  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
      {persona === null ? (
        <>
          El {tipo} se crea en estado <strong>Habilitado</strong>.
        </>
      ) : (
        <>Estado: {persona.estado === 'DESHABILITADO' ? 'Deshabilitado' : 'Habilitado'}</>
      )}
    </p>
  );
}

export interface CamposPersonaProps extends CamposProps {
  persona: Persona | null;
}

/** Campos del alta y la modificación de una persona del salón, con sus credenciales. */
export function CamposPersona({ formulario, prefijo, persona }: CamposPersonaProps) {
  return (
    <div className="space-y-4">
      {formulario.errores.general && <Alert variant="danger">{formulario.errores.general}</Alert>}
      <CampoDni formulario={formulario} prefijo={prefijo} />
      <CamposNombre formulario={formulario} prefijo={prefijo} />
      <CampoTelefono formulario={formulario} prefijo={prefijo} />
      <CamposCredenciales
        prefijo={prefijo}
        correo={formulario.correo}
        onCorreo={formulario.setCorreo}
        contrasena={formulario.contrasena}
        onContrasena={formulario.setContrasena}
        errores={formulario.errores}
        esEdicion={persona !== null}
        contrasenaObligatoria={formulario.contrasenaObligatoria}
      />
      <AvisoEstado persona={persona} tipo={prefijo} />
    </div>
  );
}
