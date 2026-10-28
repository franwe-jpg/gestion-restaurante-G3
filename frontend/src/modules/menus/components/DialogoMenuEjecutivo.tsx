import { Dialog } from '../../../shared/components/ui/dialog';
import type { ProductoSeleccionable, SeccionMenu } from '../types';

import { FormularioMenuEjecutivo } from './FormularioMenuEjecutivo';

interface DialogoMenuEjecutivoProps {
  abierto: boolean;
  productos: ProductoSeleccionable[];
  secciones: SeccionMenu[];
  cargandoOpciones: boolean;
  errorCarga?: string;
  onCambiar: (abierto: boolean) => void;
  onCreado: () => void;
}

export function DialogoMenuEjecutivo({
  abierto,
  productos,
  secciones,
  cargandoOpciones,
  errorCarga,
  onCambiar,
  onCreado,
}: DialogoMenuEjecutivoProps) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={onCambiar}
      title="Nuevo menú ejecutivo"
      description="Elegí los productos habilitados, el precio fijo y la sección de la carta."
      size="lg"
    >
      <FormularioMenuEjecutivo
        productos={productos}
        secciones={secciones}
        cargandoOpciones={cargandoOpciones}
        errorCarga={errorCarga}
        onCreado={onCreado}
        onCancelar={() => onCambiar(false)}
      />
    </Dialog>
  );
}
