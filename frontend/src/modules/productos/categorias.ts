// Configuración de la alta por categoría (HU-M1-04, C3): textos de interfaz y reglas que cambian.

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

// Edición (HU-M1-02-03, E10): solo los platos tienen pantalla de edición por ahora.
export type CategoriaEdicion = Extract<CategoriaAlta, 'PLATO'>;

export interface ConfiguracionEdicion {
  titulo: string;
  botonGuardar: string;
  modificado: string;
  errorAlModificar: string;
  noEncontrado: string;
  bajaDescripcion: string;
  dadoDeBaja: string;
  errorAlDarDeBaja: string;
}

export const CONFIGURACIONES_EDICION: Record<CategoriaEdicion, ConfiguracionEdicion> = {
  PLATO: {
    titulo: 'Editar plato',
    botonGuardar: 'Guardar cambios',
    modificado: 'Plato modificado',
    errorAlModificar: 'No se pudo modificar el plato',
    noEncontrado: 'El plato no existe.',
    bajaDescripcion:
      'El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde esta pantalla.',
    dadoDeBaja: 'Plato dado de baja',
    errorAlDarDeBaja: 'No se pudo dar de baja el plato',
  },
};
