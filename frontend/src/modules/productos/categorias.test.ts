import { describe, expect, it } from 'vitest';

import {
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
    ['BEBIDA', false],
    ['MENU_DEL_DIA', false],
  ] as const)('esCategoriaEdicion(%s) es %s', (categoria, esperado) => {
    expect(esCategoriaEdicion(categoria)).toBe(esperado);
  });

  it.each([
    ['PLATO', '/productos/platos/7/editar'],
    ['POSTRE', '/productos/postres/7/editar'],
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

  it('el plato conserva su texto de carga', () => {
    expect(CONFIGURACIONES_EDICION.PLATO.cargando).toBe('Cargando plato...');
  });
});
