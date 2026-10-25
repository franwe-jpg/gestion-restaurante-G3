import { describe, expect, it } from 'vitest';

import { convertirPrecio, errorDelServidor, validarPlato } from './validarPlato';
import type { DatosFormularioPlato } from './validarPlato';

const VALIDO: DatosFormularioPlato = {
  nombre: 'Milanesa',
  seccionId: '3',
  precio: '12.500,50',
  ingredientes: ['Carne'],
  descripcion: '',
};

describe('convertirPrecio', () => {
  it.each([
    ['12.500,50', '12500.50'],
    ['12.500', '12500'],
    ['1500,5', '1500.5'],
    ['1500', '1500'],
    ['  1.234.567,89 ', '1234567.89'],
    ['12345678,99', '12345678.99'],
  ])('convierte %s a %s', (entrada, esperado) => {
    expect(convertirPrecio(entrada)).toBe(esperado);
  });

  it.each(['abc', '', '0', '0,00', '-5', '1500,555', '12,500.50', '1.50', '123456789', '1..500'])(
    'rechaza %j',
    (entrada) => {
      expect(convertirPrecio(entrada)).toBeNull();
    },
  );
});

describe('validarPlato', () => {
  it('no marca errores en un plato completo', () => {
    expect(validarPlato(VALIDO)).toEqual({});
  });

  it('marca cada campo obligatorio vacío (CA 2)', () => {
    const errores = validarPlato({
      nombre: '   ',
      seccionId: '',
      precio: '',
      ingredientes: [],
      descripcion: '',
    });

    expect(errores).toEqual({
      nombre: 'El nombre es obligatorio.',
      seccionId: 'La sección es obligatoria.',
      precio: 'El precio es obligatorio.',
      ingredientes: 'Agregue al menos un ingrediente.',
    });
  });

  it('advierte un nombre de 101 caracteres y acepta uno de 100 (CA 4)', () => {
    expect(validarPlato({ ...VALIDO, nombre: 'a'.repeat(101) }).nombre).toBe(
      'El nombre supera los 100 caracteres permitidos.',
    );
    expect(validarPlato({ ...VALIDO, nombre: ` ${'a'.repeat(100)} ` }).nombre).toBeUndefined();
  });

  it('advierte un precio inválido (CA 5)', () => {
    expect(validarPlato({ ...VALIDO, precio: 'abc' }).precio).toMatch(/precio es inválido/);
  });

  it('advierte una descripción de más de 500 caracteres (CA 7)', () => {
    expect(validarPlato({ ...VALIDO, descripcion: 'a'.repeat(501) }).descripcion).toBe(
      'La descripción supera los 500 caracteres permitidos.',
    );
    expect(validarPlato({ ...VALIDO, descripcion: 'a'.repeat(500) }).descripcion).toBeUndefined();
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de nombre repetido bajo el campo nombre (CA 3)', () => {
    expect(errorDelServidor('El plato ya está registrado')).toEqual({
      nombre: 'El plato ya está registrado.',
    });
  });

  it('ubica el error de la sección en su campo', () => {
    expect(errorDelServidor('La sección Viejos está deshabilitada')).toEqual({
      seccionId: 'La sección elegida está deshabilitada.',
    });
  });

  it('deja el resto de los mensajes como error general', () => {
    expect(errorDelServidor('La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB')).toEqual({
      general: 'La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB',
    });
  });
});
