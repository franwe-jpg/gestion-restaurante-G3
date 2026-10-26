import { describe, expect, it } from 'vitest';

import { ETIQUETAS_CATEGORIA, esCategoriaEdicion } from './categorias';

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
    ['POSTRE', false],
    ['BEBIDA', false],
    ['MENU_DEL_DIA', false],
  ] as const)('esCategoriaEdicion(%s) es %s', (categoria, esperado) => {
    expect(esCategoriaEdicion(categoria)).toBe(esperado);
  });
});
