import { describe, expect, it } from 'vitest';

import {
  errorDelServidor,
  turnoValido,
  validarClienteNuevo,
  validarReserva,
} from './validarReserva';
import type { DatosFormularioReserva, SeleccionCliente } from './validarReserva';

const HOY = '2026-11-02';
const AHORA = '12:00';

const EXISTENTE: SeleccionCliente = {
  tipo: 'existente',
  cliente: { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' },
};

function nuevo(nombre: string, telefono: string): SeleccionCliente {
  return { tipo: 'nuevo', nombre, telefono };
}

const VALIDOS: DatosFormularioReserva = {
  cliente: EXISTENTE,
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
    const vacios = {
      cliente: { tipo: 'ninguno' } as const,
      fecha: '',
      hora: '',
      cantidad: '',
      mesa: '',
    };

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

  it('acepta una persona (límite inferior)', () => {
    expect(validar({ cantidad: '1' })).toEqual({});
  });
});

describe('validarReserva: Mesa del alta', () => {
  it('pide la mesa cuando está vacía', () => {
    expect(validar({ mesa: '' })).toEqual({ mesa: 'La mesa es obligatoria.' });
  });

  it.each(['abc', '-1', '0', '5'])(
    'solo exige que no esté vacía: «%s» no produce error de Mesa (sale de una opción del selector)',
    (mesa) => {
      expect(validar({ mesa })).toEqual({});
    },
  );
});

describe('turnoValido', () => {
  it.each([
    ['la fecha está vacía', '', '21:30'],
    ['la hora está vacía', '2026-11-03', ''],
    ['la fecha es anterior a hoy', '2026-11-01', '21:30'],
    ['hoy y la hora ya pasó', HOY, '11:30'],
    ['hoy y la hora es igual a la actual (límite)', HOY, AHORA],
  ])('es false si %s', (_caso, fecha, hora) => {
    expect(turnoValido(fecha, hora, HOY, AHORA)).toBe(false);
  });

  it.each([
    ['hoy y la hora es posterior a la actual (límite)', HOY, '12:01'],
    ['otro día con una hora anterior a la actual', '2026-11-03', '08:00'],
    ['otro día con una hora posterior', '2026-11-03', '21:30'],
  ])('es true si %s', (_caso, fecha, hora) => {
    expect(turnoValido(fecha, hora, HOY, AHORA)).toBe(true);
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

describe('validarReserva: modo edición', () => {
  function validarEdicion(cambios: Partial<DatosFormularioReserva> = {}) {
    return validarReserva({ ...VALIDOS, ...cambios }, 'edicion', HOY, AHORA);
  }

  it('acepta datos válidos', () => {
    expect(validarEdicion()).toEqual({});
  });

  it('no valida Cliente ni Mesa, aunque estén vacíos o mal escritos', () => {
    expect(validarEdicion({ cliente: { tipo: 'ninguno' }, mesa: 'abc' })).toEqual({});
  });

  it('valida fecha, hora y cantidad de personas igual que el alta', () => {
    const invalidos = { fecha: '2026-11-01', hora: '', cantidad: '0' };

    expect(validarEdicion(invalidos)).toEqual({
      fecha: 'La fecha no puede ser anterior a hoy.',
      hora: 'La hora es obligatoria.',
      cantidad: 'La cantidad de personas debe ser un entero positivo.',
    });
    expect(validarEdicion({ fecha: HOY, hora: AHORA }).hora).toBe(
      'La hora debe ser posterior a la hora actual.',
    );
  });
});

describe('validarReserva: Cliente del alta', () => {
  it('un cliente existente no produce error', () => {
    expect(validar({ cliente: EXISTENTE })).toEqual({});
  });

  it('sin cliente elegido pide el cliente', () => {
    expect(validar({ cliente: { tipo: 'ninguno' } })).toEqual({
      cliente: 'El cliente es obligatorio.',
    });
  });

  it('con cliente nuevo vacío pide Nombre y Teléfono', () => {
    expect(validar({ cliente: nuevo('', '') })).toEqual({
      nombre: 'El nombre es obligatorio',
      telefono: 'El teléfono es obligatorio',
    });
  });

  it('con cliente nuevo válido no produce error', () => {
    expect(validar({ cliente: nuevo('Luis Gómez', '280-4556677') })).toEqual({});
  });
});

/** Paridad con `ClienteNuevo` de M4 (`atencion/schemas.py`, S42): no puede ser más estricto. */
describe('validarClienteNuevo: paridad con M4', () => {
  it.each([
    ['Ana', '123'],
    ['María José', '+54 123-456'],
    ['Zoë', '--'],
    ['Ana  Luis', '123'],
    ['  Ana  ', '  123  '],
  ])('acepta nombre «%s» y teléfono «%s»', (nombre, telefono) => {
    expect(validarClienteNuevo(nombre, telefono)).toEqual({});
  });

  it.each(['Ana2', 'Ana!', 'Ana@Luis'])('rechaza el nombre «%s»', (nombre) => {
    expect(validarClienteNuevo(nombre, '123').nombre).toBe('El nombre debe contener solo letras');
  });

  it.each(['12a3', '12+34', '(123)'])('rechaza el teléfono «%s»', (telefono) => {
    expect(validarClienteNuevo('Ana', telefono).telefono).toBe(
      'El teléfono solo admite dígitos, espacios, guiones y + al inicio',
    );
  });

  it('un texto con solo espacios cuenta como vacío', () => {
    expect(validarClienteNuevo('   ', '   ')).toEqual({
      nombre: 'El nombre es obligatorio',
      telefono: 'El teléfono es obligatorio',
    });
  });
});

describe('errorDelServidor', () => {
  const MENSAJE_409 = 'La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30';

  it('deja el texto del 404, 409 o 422 como error general', () => {
    expect(errorDelServidor(MENSAJE_409, nuevo('Luis', '123'))).toEqual({ general: MENSAJE_409 });
  });

  it.each([
    'Datos invalidos. telefono: telefono solo admite dígitos, espacios, guiones y + al inicio',
    'Datos invalidos. cliente_nuevo.telefono: Field required',
  ])('lleva «%s» al campo Teléfono con un cliente nuevo', (mensaje) => {
    expect(errorDelServidor(mensaje, nuevo('Luis', 'abc'))).toEqual({ telefono: mensaje });
  });

  it('lleva el error de nombre al campo Nombre con un cliente nuevo', () => {
    const mensaje = 'Datos invalidos. nombre: nombre solo admite letras y espacios';

    expect(errorDelServidor(mensaje, nuevo('Luis3', '123'))).toEqual({ nombre: mensaje });
  });

  it.each([
    ['existente', EXISTENTE],
    ['ninguno', { tipo: 'ninguno' } as SeleccionCliente],
  ])('con cliente %s el 422 de un campo queda como error general', (_caso, seleccion) => {
    const mensaje = 'Datos invalidos. telefono: telefono es obligatorio';

    expect(errorDelServidor(mensaje, seleccion)).toEqual({ general: mensaje });
  });

  it('el 422 de cliente_id/cliente_nuevo queda como error general', () => {
    const mensaje = 'Datos invalidos. cliente_id/cliente_nuevo: indique un cliente registrado';

    expect(errorDelServidor(mensaje, nuevo('Luis', '123'))).toEqual({ general: mensaje });
  });
});
