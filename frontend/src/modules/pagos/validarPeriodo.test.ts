import { describe, expect, it } from 'vitest';

import { validarPeriodo } from './validarPeriodo';

describe('validarPeriodo', () => {
  it.each([
    ['', '', 'Faltan la fecha desde y la fecha hasta.'],
    ['', '2026-11-05', 'Falta la fecha desde.'],
    ['2026-11-01', '', 'Falta la fecha hasta.'],
    [
      '2026-11-10',
      '2026-11-05',
      'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    ],
  ])('desde=%s hasta=%s devuelve el mensaje', (desde, hasta, mensaje) => {
    expect(validarPeriodo(desde, hasta)).toBe(mensaje);
  });

  it('acepta un período de un día', () => {
    expect(validarPeriodo('2026-11-05', '2026-11-05')).toBeNull();
  });

  it('acepta un período normal', () => {
    expect(validarPeriodo('2026-11-01', '2026-11-05')).toBeNull();
  });
});
