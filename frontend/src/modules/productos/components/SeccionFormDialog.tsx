import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import type { ProductoSeleccionable } from '../types';

import { SelectorProductos } from './SelectorProductos';
import { useFormularioSeccion } from './useFormularioSeccion';

export interface SeccionFormDialogProps {
  productos: ProductoSeleccionable[];
  onCreada: () => void;
  onOpenChange: (abierto: boolean) => void;
}

/** Se monta solo mientras está abierto: cada apertura empieza con los campos vacíos. */
export function SeccionFormDialog({ productos, onCreada, onOpenChange }: SeccionFormDialogProps) {
  const formulario = useFormularioSeccion({ productos, onCreada });
  const { errores } = formulario;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Nueva sección"
      description="El orden define cómo aparecen las secciones en la carta."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void formulario.enviar()} disabled={formulario.enviando}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errores.general && <Alert variant="danger">{errores.general}</Alert>}
        <FormField id="seccion-nombre" label="Nombre" required error={errores.nombre}>
          <Input
            id="seccion-nombre"
            value={formulario.nombre}
            onChange={(evento) => formulario.setNombre(evento.target.value)}
          />
        </FormField>
        <FormField id="seccion-orden" label="Orden" required error={errores.orden}>
          <Input
            id="seccion-orden"
            inputMode="numeric"
            value={formulario.orden}
            onChange={(evento) => formulario.setOrden(evento.target.value)}
          />
        </FormField>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-700">Productos (opcional)</p>
          <SelectorProductos
            productos={productos}
            seleccionados={formulario.seleccion}
            onCambiar={formulario.setSeleccion}
          />
        </div>
      </div>
    </Dialog>
  );
}
