import { describe, expect, it } from 'vitest';

import { formatearFechaIso, formatearPeriodo } from './formatoPeriodo';

describe('formatoPeriodo', () => {
  it('formatearFechaIso devuelve dd/mm/aaaa', () => {
    expect(formatearFechaIso('2026-10-01')).toBe('01/10/2026');
  });

  it('formatearPeriodo arma «Del … al …» con año de cuatro cifras', () => {
    expect(formatearPeriodo('2026-10-01', '2026-10-31')).toBe('Del 01/10/2026 al 31/10/2026');
  });
});
