import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarMesa } from './validarMesa';

describe('validarMesa', () => {
  it('acepta número, capacidad y sector válidos (CA 1)', () => {
    expect(validarMesa({ numero: '13', capacidad: '4', sectorId: '1' })).toEqual({});
    expect(validarMesa({ numero: ' 13 ', capacidad: ' 4 ', sectorId: '1' })).toEqual({});
  });

  it('pide los tres campos cuando están vacíos (CA 2)', () => {
    expect(validarMesa({ numero: '', capacidad: '', sectorId: '' })).toEqual({
      numero: 'El número es obligatorio.',
      capacidad: 'La capacidad es obligatoria.',
      sectorId: 'El sector es obligatorio.',
    });
  });

  it.each(['tres', '3.5', '1,5', '0', '-1', '1e3', ' 0 '])(
    'rechaza el número «%s» por no ser entero positivo (CA 5)',
    (valor) => {
      expect(validarMesa({ numero: valor, capacidad: '4', sectorId: '1' }).numero).toBe(
        'El número debe ser un número entero mayor a cero.',
      );
    },
  );

  it.each(['cuatro', '4.5', '1,5', '0', '-2', '2e1'])(
    'rechaza la capacidad «%s» por no ser entera positiva (CA 6)',
    (valor) => {
      expect(validarMesa({ numero: '3', capacidad: valor, sectorId: '1' }).capacidad).toBe(
        'La capacidad debe ser un número entero mayor a cero.',
      );
    },
  );

  it('acepta números grandes porque no hay tope superior (S3)', () => {
    expect(validarMesa({ numero: '1000', capacidad: '999', sectorId: '1' })).toEqual({});
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de número repetido bajo Número con el mensaje del servidor (CA 3)', () => {
    const mensaje = 'La mesa 3 ya existe en el sector Salón principal';

    expect(errorDelServidor(mensaje)).toEqual({ numero: mensaje });
  });

  it('ubica el 409 de sector deshabilitado bajo Sector (CA sector)', () => {
    const mensaje = 'El sector Reservado está deshabilitado';

    expect(errorDelServidor(mensaje)).toEqual({ sectorId: mensaje });
  });

  it('deja cualquier otro mensaje como error general', () => {
    expect(errorDelServidor('No se pudo conectar con el backend')).toEqual({
      general: 'No se pudo conectar con el backend',
    });
  });
});
