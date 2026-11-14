import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatearFechaReserva, horaActualLocal, hoyLocal, sumarDias } from './fechas';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hoyLocal', () => {
  it('devuelve la fecha local en formato YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 12, 0));

    expect(hoyLocal()).toBe('2026-11-02');
  });

  it('cerca de la medianoche sigue siendo el día local, no el día UTC (S11)', () => {
    vi.setSystemTime(new Date(2026, 9, 28, 22, 0));

    expect(hoyLocal()).toBe('2026-10-28');
  });
});

describe('horaActualLocal', () => {
  it('devuelve la hora local en formato HH:MM con ceros a la izquierda', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 9, 5));

    expect(horaActualLocal()).toBe('09:05');
  });
});

describe('sumarDias', () => {
  it.each([
    ['2026-11-02', 1, '2026-11-03'],
    ['2026-11-02', -1, '2026-11-01'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
  ])('%s con %i día(s) da %s', (fecha, dias, esperada) => {
    expect(sumarDias(fecha, dias)).toBe(esperada);
  });
});

describe('formatearFechaReserva', () => {
  it('arma DD/MM/AAAA desde el texto, sin correr el día en ninguna zona horaria (S11)', () => {
    expect(formatearFechaReserva('2026-10-24')).toBe('24/10/2026');
  });
});
