import { useState } from 'react';

import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useToast } from '../../../shared/hooks/useToast';
import { darDeBajaProducto } from '../api';
import { CONFIGURACIONES_EDICION } from '../categorias';
import type { CategoriaEdicion } from '../categorias';
import type { ProductoSalida } from '../types';

export interface OpcionesBajaProducto {
  categoria: CategoriaEdicion;
  producto: Pick<ProductoSalida, 'id' | 'nombre'>;
  onDadoDeBaja: () => void;
}

export function useBajaProducto({ categoria, producto, onDadoDeBaja }: OpcionesBajaProducto) {
  const configuracion = CONFIGURACIONES_EDICION[categoria];
  const confirmar = useConfirm();
  const { mostrarToast } = useToast();
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  const darDeBaja = async () => {
    const aceptado = await confirmar({
      titulo: `¿Dar de baja «${producto.nombre}»?`,
      descripcion: configuracion.bajaDescripcion,
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    if (!aceptado) return;

    setDandoDeBaja(true);
    const respuesta = await darDeBajaProducto(categoria, producto.id);
    setDandoDeBaja(false);

    if (respuesta.exito) {
      mostrarToast({ titulo: configuracion.dadoDeBaja, variante: 'success' });
      onDadoDeBaja();
      return;
    }
    mostrarToast({
      titulo: configuracion.errorAlDarDeBaja,
      descripcion: respuesta.error,
      variante: 'danger',
    });
  };

  return { dandoDeBaja, darDeBaja };
}
