// Configuración de la alta por categoría (HU-M1-04, C3): textos de interfaz y reglas que cambian.

import type { Categoria } from './types';

export type CategoriaAlta = 'PLATO' | 'POSTRE';

export interface ConfiguracionAlta {
  titulo: string;
  botonGuardar: string;
  creado: string;
  errorAlCrear: string;
  avisoSinSecciones: string;
  nombreRepetido: string;
  ingredientesObligatorios: boolean;
}

export const CONFIGURACIONES: Record<CategoriaAlta, ConfiguracionAlta> = {
  PLATO: {
    titulo: 'Nuevo plato',
    botonGuardar: 'Guardar plato',
    creado: 'Plato creado',
    errorAlCrear: 'No se pudo crear el plato',
    avisoSinSecciones: 'El plato necesita una sección habilitada.',
    nombreRepetido: 'El plato ya está registrado.',
    ingredientesObligatorios: true,
  },
  POSTRE: {
    titulo: 'Nuevo postre',
    botonGuardar: 'Guardar postre',
    creado: 'Postre creado',
    errorAlCrear: 'No se pudo crear el postre',
    avisoSinSecciones: 'El postre necesita una sección habilitada.',
    nombreRepetido: 'El postre ya está registrado.',
    ingredientesObligatorios: true,
  },
};

export const ETIQUETAS_CATEGORIA: Record<Categoria, string> = {
  PLATO: 'Plato',
  POSTRE: 'Postre',
  BEBIDA: 'Bebida',
  MENU_DEL_DIA: 'Menú del día',
};

// Edición (HU-M1-02-03, E10; HU-M1-05-06, F3): los platos y los postres tienen pantalla de edición.
export type CategoriaEdicion = Extract<CategoriaAlta, 'PLATO' | 'POSTRE'>;

/** Solo las categorías con configuración de edición se editan y se dan de baja (E21, S31). */
export function esCategoriaEdicion(categoria: Categoria): categoria is CategoriaEdicion {
  return categoria in CONFIGURACIONES_EDICION;
}

const SEGMENTOS_RUTA: Record<CategoriaAlta, string> = {
  PLATO: 'platos',
  POSTRE: 'postres',
};

/** Ruta de la pantalla de edición de un producto (F4). */
export function rutaDeEdicion(categoria: CategoriaEdicion, id: number): string {
  return `/productos/${SEGMENTOS_RUTA[categoria]}/${id}/editar`;
}

export interface ConfiguracionEdicion {
  titulo: string;
  botonGuardar: string;
  modificado: string;
  errorAlModificar: string;
  noEncontrado: string;
  bajaDescripcion: string;
  dadoDeBaja: string;
  errorAlDarDeBaja: string;
  cargando: string;
}

export const CONFIGURACIONES_EDICION: Record<CategoriaEdicion, ConfiguracionEdicion> = {
  PLATO: {
    titulo: 'Editar plato',
    botonGuardar: 'Guardar cambios',
    modificado: 'Plato modificado',
    errorAlModificar: 'No se pudo modificar el plato',
    noEncontrado: 'El plato no existe.',
    bajaDescripcion:
      'El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.',
    dadoDeBaja: 'Plato dado de baja',
    errorAlDarDeBaja: 'No se pudo dar de baja el plato',
    cargando: 'Cargando plato...',
  },
  POSTRE: {
    titulo: 'Editar postre',
    botonGuardar: 'Guardar cambios',
    modificado: 'Postre modificado',
    errorAlModificar: 'No se pudo modificar el postre',
    noEncontrado: 'El postre no existe.',
    bajaDescripcion:
      'El postre quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.',
    dadoDeBaja: 'Postre dado de baja',
    errorAlDarDeBaja: 'No se pudo dar de baja el postre',
    cargando: 'Cargando postre...',
  },
};
