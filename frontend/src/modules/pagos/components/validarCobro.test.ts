import { describe, expect, it } from 'vitest';

import { normalizarImporte, validarImporte, validarMontoCobro } from './validarCobro';

describe('normalizarImporte', () => {
  it('acepta coma o punto y completa los decimales', () => {
    expect(normalizarImporte('1500,5')).toBe('1500.50');
    expect(normalizarImporte(' 7101 ')).toBe('7101.00');
    expect(normalizarImporte('10.25')).toBe('10.25');
  });
});

describe('validarImporte', () => {
  it('acepta un importe igual o menor al total', () => {
    expect(validarImporte('7101.00', '7101.00')).toBeUndefined();
    expect(validarImporte('1000,5', '7101.00')).toBeUndefined();
  });

  it('rechaza un importe mayor al total', () => {
    expect(validarImporte('7101.01', '7101.00')).toBe(
      'El importe no puede superar el total de la factura.',
    );
  });

  it('rechaza cero, negativos, vacío y texto', () => {
    expect(validarImporte('0', '10.00')).toBe('El importe debe ser mayor a cero.');
    expect(validarImporte('-5', '10.00')).toMatch(/válido/);
    expect(validarImporte('', '10.00')).toMatch(/válido/);
    expect(validarImporte('abc', '10.00')).toMatch(/válido/);
    expect(validarImporte('1.234', '10.00')).toMatch(/válido/);
  });
});

describe('validarMontoCobro (HU-M6-02)', () => {
  it('acepta un monto igual o menor al saldo pendiente', () => {
    expect(validarMontoCobro('6101.00', '6101.00')).toBeUndefined();
    expect(validarMontoCobro('1000,5', '6101.00')).toBeUndefined();
  });

  it('rechaza un monto mayor al saldo pendiente', () => {
    expect(validarMontoCobro('6101.01', '6101.00')).toBe(
      'El importe no puede superar el saldo pendiente de la factura.',
    );
  });

  it('rechaza cero, negativos, vacío y texto', () => {
    expect(validarMontoCobro('0', '10.00')).toBe('El importe debe ser mayor a cero.');
    expect(validarMontoCobro('-5', '10.00')).toMatch(/válido/);
    expect(validarMontoCobro('', '10.00')).toMatch(/válido/);
    expect(validarMontoCobro('abc', '10.00')).toMatch(/válido/);
  });
});
