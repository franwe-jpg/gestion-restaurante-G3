import { Dialog } from '../../../shared/components/ui/dialog';
import type { MenuEjecutivo, ProductoMenu, SeccionMenu } from '../types';

import { FormularioMenuEjecutivo } from './FormularioMenuEjecutivo';

interface DialogoMenuEjecutivoProps {
  abierto: boolean;
  menu?: MenuEjecutivo | null;
  productos: ProductoMenu[];
  secciones: SeccionMenu[];
  cargandoOpciones: boolean;
  errorCarga?: string;
  onCambiar: (abierto: boolean) => void;
  onGuardado: () => void;
}

function productosConLosDelMenu(
  productos: ProductoMenu[],
  menu?: MenuEjecutivo | null,
): ProductoMenu[] {
  if (!menu) return productos;
  const disponibles = new Set(productos.map((producto) => producto.id));
  const actuales = menu.productos.filter((producto) => !disponibles.has(producto.id));
  return [...productos, ...actuales];
}

export function DialogoMenuEjecutivo({
  abierto,
  menu,
  productos,
  secciones,
  cargandoOpciones,
  errorCarga,
  onCambiar,
  onGuardado,
}: DialogoMenuEjecutivoProps) {
  const editando = Boolean(menu);
  return (
    <Dialog
      open={abierto}
      onOpenChange={onCambiar}
      title={editando ? 'Editar menú ejecutivo' : 'Nuevo menú ejecutivo'}
      description={
        editando
          ? 'Actualizá los datos, el estado o los productos del menú.'
          : 'Elegí los productos habilitados, el precio fijo y la sección de la carta.'
      }
      size="lg"
    >
      <FormularioMenuEjecutivo
        key={menu?.id ?? 'nuevo'}
        menu={menu}
        productos={productosConLosDelMenu(productos, menu)}
        secciones={secciones}
        cargandoOpciones={cargandoOpciones}
        errorCarga={errorCarga}
        onGuardado={onGuardado}
        onCancelar={() => onCambiar(false)}
      />
    </Dialog>
  );
}
