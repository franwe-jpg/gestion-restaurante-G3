import { ImagePlus } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import { FormField } from '../../../shared/components/ui/form-field';
import { urlDeImagen } from '../api';
import type { MenuDelDia } from '../types';

import type { FormularioMenuDelDia as Estado } from './useFormularioMenuDelDia';

export interface CampoImagenMenuProps {
  formulario: Estado;
  menu?: MenuDelDia;
}

/** Imagen opcional del menú del día; en el celular abre la cámara (HU-M2-04, CA 11 a 13). */
export function CampoImagenMenu({ formulario, menu }: CampoImagenMenuProps) {
  const actual = formulario.quitarImagen ? null : urlDeImagen(menu?.imagen_url ?? null);

  return (
    <FormField id="menu-imagen" label="Imagen">
      <div className="flex flex-wrap items-center gap-3">
        {actual !== null && (
          <img src={actual} alt="" className="h-14 w-14 rounded-md object-cover" />
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {formulario.imagen?.name ?? 'Elegir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic"
            capture="environment"
            className="sr-only"
            onChange={(evento) => formulario.cambiarImagen(evento.target.files?.[0] ?? null)}
          />
        </label>
        {actual !== null && (
          <Button type="button" variant="ghost" onClick={formulario.quitarImagenActual}>
            Quitar imagen
          </Button>
        )}
      </div>
    </FormField>
  );
}
