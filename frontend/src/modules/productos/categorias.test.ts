import { describe, expect, it } from 'vitest';

import {
  CONFIGURACIONES,
  CONFIGURACIONES_EDICION,
  ETIQUETAS_CATEGORIA,
  esCategoriaEdicion,
  rutaDeEdicion,
} from './categorias';

describe('categorias', () => {
  it('da una etiqueta legible por categoría', () => {
    expect(ETIQUETAS_CATEGORIA).toEqual({
      PLATO: 'Plato',
      POSTRE: 'Postre',
      BEBIDA: 'Bebida',
      MENU_DEL_DIA: 'Menú del día',
    });
  });

  it.each([
    ['PLATO', true],
    ['POSTRE', true],
    ['BEBIDA', true],
    ['MENU_DEL_DIA', false],
  ] as const)('esCategoriaEdicion(%s) es %s', (categoria, esperado) => {
    expect(esCategoriaEdicion(categoria)).toBe(esperado);
  });

  it.each([
    ['PLATO', '/productos/platos/7/editar'],
    ['POSTRE', '/productos/postres/7/editar'],
    ['BEBIDA', '/productos/bebidas/7/editar'],
  ] as const)('rutaDeEdicion(%s, 7) es %s', (categoria, esperada) => {
    expect(rutaDeEdicion(categoria, 7)).toBe(esperada);
  });

  it('el postre tiene sus textos de edición (S32)', () => {
    expect(CONFIGURACIONES_EDICION.POSTRE).toEqual({
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
    });
  });
});

describe('categorias: bebidas', () => {
  it('la bebida tiene sus textos de edición (S46)', () => {
    expect(CONFIGURACIONES_EDICION.BEBIDA).toEqual({
      titulo: 'Editar bebida',
      botonGuardar: 'Guardar cambios',
      modificado: 'Bebida modificada',
      errorAlModificar: 'No se pudo modificar la bebida',
      noEncontrado: 'La bebida no existe.',
      bajaDescripcion:
        'La bebida quedará deshabilitada y dejará de mostrarse en la carta. Puede volver a habilitarla desde la pantalla de edición.',
      dadoDeBaja: 'Bebida dada de baja',
      errorAlDarDeBaja: 'No se pudo dar de baja la bebida',
      cargando: 'Cargando bebida...',
    });
  });

  it('la bebida tiene sus textos de alta y no exige ingredientes (S44, S46)', () => {
    expect(CONFIGURACIONES.BEBIDA).toEqual({
      titulo: 'Nueva bebida',
      botonGuardar: 'Guardar bebida',
      creado: 'Bebida creada',
      errorAlCrear: 'No se pudo crear la bebida',
      avisoSinSecciones: 'La bebida necesita una sección habilitada.',
      nombreRepetido: 'La bebida ya está registrada.',
      ingredientesObligatorios: false,
    });
  });

  it.each([
    ['PLATO', true],
    ['POSTRE', true],
    ['BEBIDA', false],
  ] as const)('los ingredientes de %s son obligatorios: %s', (categoria, esperado) => {
    expect(CONFIGURACIONES[categoria].ingredientesObligatorios).toBe(esperado);
  });

  it('el plato conserva su texto de carga', () => {
    expect(CONFIGURACIONES_EDICION.PLATO.cargando).toBe('Cargando plato...');
  });
});
