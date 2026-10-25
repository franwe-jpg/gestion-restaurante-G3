import { describe, expect, it } from 'vitest';

import {
  convertirPrecio,
  errorDelServidor,
  precioParaEditar,
  validarProducto,
} from './validarProducto';
import { CONFIGURACIONES } from '../categorias';
import type { DatosFormularioProducto } from './validarProducto';

const OBLIGATORIOS = { ingredientesObligatorios: true };

const VALIDO: DatosFormularioProducto = {
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

describe('validarProducto', () => {
  it('no marca errores en un plato completo', () => {
    expect(validarProducto(VALIDO, OBLIGATORIOS)).toEqual({});
  });

  it('marca cada campo obligatorio vacío (CA 2)', () => {
    const errores = validarProducto(
      {
        nombre: '   ',
        seccionId: '',
        precio: '',
        ingredientes: [],
        descripcion: '',
      },
      OBLIGATORIOS,
    );

    expect(errores).toEqual({
      nombre: 'El nombre es obligatorio.',
      seccionId: 'La sección es obligatoria.',
      precio: 'El precio es obligatorio.',
      ingredientes: 'Agregue al menos un ingrediente.',
    });
  });

  it('advierte un nombre de 101 caracteres y acepta uno de 100 (CA 4)', () => {
    expect(validarProducto({ ...VALIDO, nombre: 'a'.repeat(101) }, OBLIGATORIOS).nombre).toBe(
      'El nombre supera los 100 caracteres permitidos.',
    );
    expect(
      validarProducto({ ...VALIDO, nombre: ` ${'a'.repeat(100)} ` }, OBLIGATORIOS).nombre,
    ).toBeUndefined();
  });

  it('acepta ingredientes vacíos cuando la categoría no los exige', () => {
    const errores = validarProducto(
      { ...VALIDO, ingredientes: [] },
      { ingredientesObligatorios: false },
    );

    expect(errores.ingredientes).toBeUndefined();
  });
});

describe('validarProducto: precio y descripción', () => {
  it('advierte un precio inválido (CA 5)', () => {
    expect(validarProducto({ ...VALIDO, precio: 'abc' }, OBLIGATORIOS).precio).toMatch(
      /precio es inválido/,
    );
  });

  it('advierte una descripción de más de 500 caracteres (CA 7)', () => {
    expect(
      validarProducto({ ...VALIDO, descripcion: 'a'.repeat(501) }, OBLIGATORIOS).descripcion,
    ).toBe('La descripción supera los 500 caracteres permitidos.');
    expect(
      validarProducto({ ...VALIDO, descripcion: 'a'.repeat(500) }, OBLIGATORIOS).descripcion,
    ).toBeUndefined();
  });
});

describe('errorDelServidor', () => {
  it.each([
    ['PLATO', 'El plato ya está registrado', 'El plato ya está registrado.'],
    ['POSTRE', 'El postre ya está registrado', 'El postre ya está registrado.'],
  ] as const)(
    'ubica el 409 de nombre repetido de %s bajo el campo nombre (CA 3)',
    (categoria, mensaje, esperado) => {
      expect(errorDelServidor(mensaje, CONFIGURACIONES[categoria])).toEqual({ nombre: esperado });
    },
  );

  it('ubica el error de la sección en su campo', () => {
    expect(
      errorDelServidor('La sección Viejos está deshabilitada', CONFIGURACIONES.POSTRE),
    ).toEqual({
      seccionId: 'La sección elegida está deshabilitada.',
    });
  });

  it('deja el resto de los mensajes como error general', () => {
    expect(
      errorDelServidor(
        'La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB',
        CONFIGURACIONES.PLATO,
      ),
    ).toEqual({
      general: 'La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB',
    });
  });
});

describe('precioParaEditar', () => {
  it.each([
    ['12500.50', '12.500,50'],
    ['12500.00', '12.500,00'],
    ['500.5', '500,5'],
    ['500', '500'],
    ['1234567.89', '1.234.567,89'],
  ])('convierte %s a %s', (entrada, esperado) => {
    expect(precioParaEditar(entrada)).toBe(esperado);
  });

  it.each(['12500.50', '1.50', '1234567.89', '99'])(
    'ida y vuelta con convertirPrecio para %s',
    (precio) => {
      expect(convertirPrecio(precioParaEditar(precio))).toBe(precio);
    },
  );
});
