import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { horaActualLocal, hoyLocal } from './fechas';

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
