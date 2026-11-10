import { describe, expect, it } from 'vitest';

import { validarFiltrosReporte } from './validarFiltrosReporte';

describe('validarFiltrosReporte', () => {
  it('exige ambas fechas antes que la promoción', () => {
    expect(validarFiltrosReporte('', '', '')).toBe('Faltan la fecha desde y la fecha hasta.');
    expect(validarFiltrosReporte('2026-11-01', '', '1')).toBe('Falta la fecha hasta.');
    expect(validarFiltrosReporte('', '2026-11-10', '1')).toBe('Falta la fecha desde.');
  });

  it('avisa cuando el período es inverso', () => {
    expect(validarFiltrosReporte('2026-11-10', '2026-11-01', '1')).toBe(
      'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    );
  });

  it('avisa cuando falta la promoción', () => {
    expect(validarFiltrosReporte('2026-11-01', '2026-11-10', '')).toBe(
      'Falta seleccionar la promoción.',
    );
  });

  it('acepta filtros completos y válidos', () => {
    expect(validarFiltrosReporte('2026-11-01', '2026-11-10', '3')).toBeNull();
  });
});
