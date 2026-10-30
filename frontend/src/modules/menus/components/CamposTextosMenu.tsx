import { FormField } from '../../../shared/components/ui/form-field';
import { Textarea } from '../../../shared/components/ui/textarea';

import { ListaDeTextos } from './ListaDeTextos';
import type { FormularioMenuDelDia as Estado } from './useFormularioMenuDelDia';

/** Ingredientes, etiquetas y descripción (HU-M2-04, CA 6 a 8 y 14). */
export function CamposTextosMenu({ formulario }: { formulario: Estado }) {
  const { valores, errores } = formulario;

  return (
    <>
      <ListaDeTextos
        id="menu-ingredientes"
        etiqueta="Ingredientes"
        singular="ingrediente"
        valores={valores.ingredientes}
        onCambiar={(ingredientes) => formulario.cambiar({ ingredientes })}
        tope={50}
        maximoPorTexto={100}
        placeholder="Agregar un ingrediente y presionar Enter"
        required
        error={errores.ingredientes}
      />

      <ListaDeTextos
        id="menu-etiquetas"
        etiqueta="Etiquetas"
        singular="etiqueta"
        valores={valores.etiquetas}
        onCambiar={(etiquetas) => formulario.cambiar({ etiquetas })}
        tope={20}
        maximoPorTexto={30}
        placeholder="Agregar una etiqueta y presionar Enter"
        error={errores.etiquetas}
      />

      <FormField id="menu-descripcion" label="Descripción" error={errores.descripcion}>
        <Textarea
          id="menu-descripcion"
          rows={2}
          value={valores.descripcion}
          onChange={(evento) => formulario.cambiar({ descripcion: evento.target.value })}
        />
      </FormField>
    </>
  );
}
