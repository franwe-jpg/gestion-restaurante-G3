import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';

import type { ErrorDelServidor } from './validarPersona';

export interface CamposCredencialesProps {
  /** Prefijo de los `id` (por ejemplo, `mozo` o `chef`). */
  prefijo: string;
  correo: string;
  onCorreo: (valor: string) => void;
  contrasena: string;
  onContrasena: (valor: string) => void;
  errores: ErrorDelServidor;
  esEdicion: boolean;
  contrasenaObligatoria: boolean;
}

function ayudaDeContrasena(esEdicion: boolean, obligatoria: boolean): string {
  if (!esEdicion) return 'De 8 a 72 caracteres.';
  if (obligatoria) return 'Todavía no tiene usuario: la contraseña es obligatoria (mínimo 8).';
  return 'Dejala vacía para conservar la actual. Si la escribís, mínimo 8 caracteres.';
}

/** Correo y contraseña del usuario vinculado; compartidos por los formularios de mozo y chef. */
export function CamposCredenciales({
  prefijo,
  correo,
  onCorreo,
  contrasena,
  onContrasena,
  errores,
  esEdicion,
  contrasenaObligatoria,
}: CamposCredencialesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={`${prefijo}-correo`} label="Correo" required error={errores.correo}>
        <Input
          id={`${prefijo}-correo`}
          type="email"
          autoComplete="off"
          value={correo}
          onChange={(evento) => onCorreo(evento.target.value)}
        />
      </FormField>
      <FormField
        id={`${prefijo}-contrasena`}
        label="Contraseña"
        required={contrasenaObligatoria}
        hint={ayudaDeContrasena(esEdicion, contrasenaObligatoria)}
        error={errores.contrasena}
      >
        <Input
          id={`${prefijo}-contrasena`}
          type="password"
          autoComplete="new-password"
          value={contrasena}
          onChange={(evento) => onContrasena(evento.target.value)}
        />
      </FormField>
    </div>
  );
}
