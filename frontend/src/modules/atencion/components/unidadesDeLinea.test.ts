import { describe, expect, it } from 'vitest';

import { unidadesDeLinea } from './unidadesDeLinea';

const linea = (cantidad: number, entregada: number, lista: number) => ({
  cantidad,
  cantidad_entregada: entregada,
  cantidad_lista: lista,
});

describe('unidadesDeLinea', () => {
  it('reparte una línea con los tres estados (c 10, e 2, l 7)', () => {
    expect(unidadesDeLinea(linea(10, 2, 7))).toEqual({ entregadas: 2, listas: 5, pendientes: 3 });
  });

  it('con lista menor que lo entregado cuenta lo entregado (c 10, e 6, l 2)', () => {
    expect(unidadesDeLinea(linea(10, 6, 2))).toEqual({ entregadas: 6, listas: 0, pendientes: 4 });
  });

  it('sin nada marcado deja todo pendiente', () => {
    expect(unidadesDeLinea(linea(5, 0, 0))).toEqual({ entregadas: 0, listas: 0, pendientes: 5 });
  });

  it('con todo listo y nada entregado no deja pendientes', () => {
    expect(unidadesDeLinea(linea(3, 0, 3))).toEqual({ entregadas: 0, listas: 3, pendientes: 0 });
  });

  it('con todo entregado no deja listas ni pendientes', () => {
    expect(unidadesDeLinea(linea(3, 3, 0))).toEqual({ entregadas: 3, listas: 0, pendientes: 0 });
    expect(unidadesDeLinea(linea(3, 3, 3))).toEqual({ entregadas: 3, listas: 0, pendientes: 0 });
  });

  it('la suma de los tres estados es siempre la cantidad', () => {
    const casos: [number, number][] = [
      [0, 0],
      [2, 7],
      [6, 2],
      [10, 10],
      [4, 4],
      [0, 10],
    ];
    for (const [e, l] of casos) {
      const u = unidadesDeLinea(linea(10, e, l));
      expect(u.entregadas + u.listas + u.pendientes).toBe(10);
    }
  });
});
