import { describe, expect, it } from 'vitest';

import { FILTROS_ESTADO } from './filtrosEstado';

describe('FILTROS_ESTADO', () => {
  it('ofrece Habilitados, Deshabilitados y Todos con su texto de vacío', () => {
    expect(FILTROS_ESTADO.map((f) => [f.valor, f.etiqueta, f.vacioTitulo])).toEqual([
      ['HABILITADO', 'Habilitados', 'No hay productos habilitados'],
      ['DESHABILITADO', 'Deshabilitados', 'No hay productos deshabilitados'],
      ['TODOS', 'Todos', 'Todavía no hay productos'],
    ]);
  });

  it('describe cada vacío', () => {
    for (const filtro of FILTROS_ESTADO) expect(filtro.vacioDescripcion.length).toBeGreaterThan(0);
  });
});
