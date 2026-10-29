import { describe, expect, it } from 'vitest';

import { normalizarPrecio, validarMenuDelDia } from './validarMenuDelDia';
import type { ValoresMenuDelDia } from './validarMenuDelDia';

function valores(cambios: Partial<ValoresMenuDelDia> = {}): ValoresMenuDelDia {
  return {
    nombre: 'Guiso de lentejas',
    seccionId: 1,
    precio: '9900',
    ingredientes: ['Lentejas'],
    etiquetas: [],
    descripcion: '',
    ...cambios,
  };
}

describe('normalizarPrecio', () => {
  it.each([
    ['9900', '9900.00'],
    ['9.900', '9900.00'],
    ['9900,50', '9900.50'],
    ['9900.5', '9900.50'],
    ['10.999', '10999.00'],
  ])('convierte %s en %s', (texto, esperado) => {
    expect(normalizarPrecio(texto)).toBe(esperado);
  });

  it.each(['', '0', '-10', 'abc', '10,9,9', '10.999,5,5'])('rechaza %s', (texto) => {
    expect(normalizarPrecio(texto)).toBeNull();
  });
});

describe('validarMenuDelDia', () => {
  it('no devuelve errores con datos válidos', () => {
    expect(validarMenuDelDia(valores())).toEqual({});
  });

  it('exige el nombre', () => {
    expect(validarMenuDelDia(valores({ nombre: '   ' })).nombre).toBeDefined();
  });

  it('rechaza un nombre de más de 100 caracteres', () => {
    expect(validarMenuDelDia(valores({ nombre: 'x'.repeat(101) })).nombre).toBeDefined();
  });

  it('exige una sección', () => {
    expect(validarMenuDelDia(valores({ seccionId: null })).seccionId).toBeDefined();
  });

  it('rechaza el precio inválido', () => {
    expect(validarMenuDelDia(valores({ precio: '0' })).precio).toBeDefined();
  });

  it('exige al menos un ingrediente', () => {
    expect(validarMenuDelDia(valores({ ingredientes: [] })).ingredientes).toBeDefined();
  });

  it('rechaza una descripción de más de 500 caracteres', () => {
    expect(validarMenuDelDia(valores({ descripcion: 'x'.repeat(501) })).descripcion).toBeDefined();
  });
});
