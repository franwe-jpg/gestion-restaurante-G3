import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import type { SeccionResumen } from '../types';

import type { FormularioMenuDelDia as Estado } from './useFormularioMenuDelDia';

export interface CamposBasicosMenuProps {
  formulario: Estado;
  secciones: SeccionResumen[];
}

/** Nombre, sección y precio del menú del día (HU-M2-04, CA 2 a 5 y 10). */
export function CamposBasicosMenu({ formulario, secciones }: CamposBasicosMenuProps) {
  const { valores, errores } = formulario;

  return (
    <>
      <FormField id="menu-nombre" label="Nombre" required error={errores.nombre}>
        <Input
          id="menu-nombre"
          value={valores.nombre}
          onChange={(evento) => formulario.cambiar({ nombre: evento.target.value })}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="menu-seccion" label="Sección" required error={errores.seccionId}>
          <Select
            id="menu-seccion"
            value={valores.seccionId === null ? '' : String(valores.seccionId)}
            onChange={(evento) => formulario.cambiar({ seccionId: Number(evento.target.value) })}
          >
            <option value="">Elegí una sección</option>
            {secciones.map((seccion) => (
              <option key={seccion.id} value={seccion.id}>
                {seccion.nombre}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="menu-precio" label="Precio" required error={errores.precio}>
          <Input
            id="menu-precio"
            inputMode="decimal"
            value={valores.precio}
            onChange={(evento) => formulario.cambiar({ precio: evento.target.value })}
          />
        </FormField>
      </div>
    </>
  );
}
