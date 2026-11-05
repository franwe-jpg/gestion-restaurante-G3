import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarMozo } from './validarMozo';

const VALIDO = {
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
};

describe('validarMozo', () => {
  it('acepta los datos válidos (CA 1)', () => {
    expect(validarMozo(VALIDO)).toEqual({});
    expect(validarMozo({ ...VALIDO, telefono: '' })).toEqual({});
  });

  it('pide DNI, nombre y apellido cuando están vacíos (CA 2)', () => {
    expect(validarMozo({ dni: '', nombre: '', apellido: '', telefono: '' })).toEqual({
      dni: 'El DNI es obligatorio.',
      nombre: 'El nombre es obligatorio.',
      apellido: 'El apellido es obligatorio.',
    });
  });

  it.each(['301234', '301234567', '3012345a', '30.123.456', 'abcdefgh'])(
    'rechaza el DNI «%s» por no tener 7 u 8 dígitos (CA 5)',
    (dni) => {
      expect(validarMozo({ ...VALIDO, dni }).dni).toBe('El DNI debe tener 7 u 8 dígitos.');
    },
  );

  it('acepta DNI de 7 u 8 dígitos (CA 5)', () => {
    expect(validarMozo({ ...VALIDO, dni: '7123456' })).toEqual({});
    expect(validarMozo({ ...VALIDO, dni: ' 30123456 ' })).toEqual({});
  });

  it.each(['Juan123', 'Juan!', 'Fer$andez'])(
    'rechaza el nombre «%s» por no tener solo letras (CA 6)',
    (nombre) => {
      expect(validarMozo({ ...VALIDO, nombre }).nombre).toBe(
        'El nombre solo debe contener letras.',
      );
    },
  );

  it.each(['Fernández2', 'Pérez@'])(
    'rechaza el apellido «%s» por no tener solo letras (CA 6)',
    (apellido) => {
      expect(validarMozo({ ...VALIDO, apellido }).apellido).toBe(
        'El apellido solo debe contener letras.',
      );
    },
  );

  it('acepta nombres con acentos y espacios', () => {
    expect(validarMozo({ ...VALIDO, nombre: 'María José', apellido: 'Núñez' })).toEqual({});
  });

  it('rechaza un teléfono de más de 30 caracteres', () => {
    expect(validarMozo({ ...VALIDO, telefono: 'a'.repeat(31) }).telefono).toBe(
      'El teléfono supera los 30 caracteres permitidos.',
    );
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de DNI repetido bajo DNI (CA 3)', () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';

    expect(errorDelServidor(mensaje)).toEqual({ dni: mensaje });
  });

  it('deja cualquier otro mensaje como error general', () => {
    expect(errorDelServidor('No se pudo conectar con el backend')).toEqual({
      general: 'No se pudo conectar con el backend',
    });
  });
});
