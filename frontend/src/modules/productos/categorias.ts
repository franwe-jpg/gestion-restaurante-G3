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
