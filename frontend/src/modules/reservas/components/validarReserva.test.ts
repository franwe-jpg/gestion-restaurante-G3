import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarReserva } from './validarReserva';
import type { DatosFormularioReserva } from './validarReserva';

const HOY = '2026-11-02';
const AHORA = '12:00';

const VALIDOS: DatosFormularioReserva = {
  cliente: '7',
  fecha: '2026-11-03',
  hora: '21:30',
  cantidad: '4',
  mesa: '5',
};

function validar(cambios: Partial<DatosFormularioReserva> = {}) {
  return validarReserva({ ...VALIDOS, ...cambios }, 'alta', HOY, AHORA);
}

describe('validarReserva: datos obligatorios', () => {
  it('acepta datos válidos', () => {
    expect(validar()).toEqual({});
  });

  it('pide cada campo vacío (formulario de alta)', () => {
    const vacios = { cliente: '', fecha: '', hora: '', cantidad: '', mesa: '' };

    expect(validar(vacios)).toEqual({
      cliente: 'El cliente es obligatorio.',
      fecha: 'La fecha es obligatoria.',
      hora: 'La hora es obligatoria.',
      cantidad: 'La cantidad de personas es obligatoria.',
      mesa: 'La mesa es obligatoria.',
    });
  });

  it('trata un texto con solo espacios como vacío', () => {
    expect(validar({ cantidad: '   ' }).cantidad).toBe('La cantidad de personas es obligatoria.');
  });
});

describe('validarReserva: enteros positivos', () => {
  it.each(['0', '-2', 'abc', '2.5'])('rechaza la cantidad de personas %s', (cantidad) => {
    expect(validar({ cantidad }).cantidad).toBe(
      'La cantidad de personas debe ser un entero positivo.',
    );
  });

  it('rechaza Cliente 0 y Mesa -1', () => {
    expect(validar({ cliente: '0', mesa: '-1' })).toEqual({
      cliente: 'El cliente debe ser un entero positivo.',
      mesa: 'La mesa debe ser un entero positivo.',
    });
  });

  it('acepta una persona (límite inferior)', () => {
    expect(validar({ cantidad: '1' })).toEqual({});
  });
});

describe('validarReserva: fecha y hora', () => {
  it('rechaza una fecha anterior a hoy', () => {
    expect(validar({ fecha: '2026-11-01' }).fecha).toBe('La fecha no puede ser anterior a hoy.');
  });

  it('acepta hoy con la fecha igual (límite) si la hora es posterior', () => {
    expect(validar({ fecha: HOY, hora: '12:01' })).toEqual({});
  });

  it.each(['11:30', '12:00'])('rechaza hoy con la hora %s (pasada o igual)', (hora) => {
    expect(validar({ fecha: HOY, hora }).hora).toBe('La hora debe ser posterior a la hora actual.');
  });

  it('acepta otro día con una hora anterior a la actual', () => {
    expect(validar({ fecha: '2026-11-03', hora: '08:00' })).toEqual({});
  });
});

describe('errorDelServidor', () => {
  it('deja el texto del 404, 409 o 422 como error general', () => {
    const mensaje = 'La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30';

    expect(errorDelServidor(mensaje)).toEqual({ general: mensaje });
  });
});
