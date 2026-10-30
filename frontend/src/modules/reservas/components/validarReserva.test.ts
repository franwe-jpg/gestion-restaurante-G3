import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarReserva } from './validarReserva';
import type { DatosFormularioReserva } from './validarReserva';

const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const VALIDOS: DatosFormularioReserva = {
  clienteNombre: 'Ana Pérez',
  clienteTelefono: '2804000000',
  fecha: MANANA,
  hora: '21:00',
  cantidadPersonas: '4',
  mesaId: '2',
};

describe('validarReserva: alta (incluye cliente y mesa)', () => {
  it('sin errores con todos los datos válidos', () => {
    expect(validarReserva(VALIDOS, { incluirMesaYCliente: true })).toEqual({});
  });

  it('exige el nombre del cliente y solo letras', () => {
    expect(
      validarReserva({ ...VALIDOS, clienteNombre: '' }, { incluirMesaYCliente: true }),
    ).toEqual({
      clienteNombre: 'El nombre del cliente es obligatorio.',
    });
    expect(
      validarReserva({ ...VALIDOS, clienteNombre: 'Ana123' }, { incluirMesaYCliente: true }),
    ).toEqual({ clienteNombre: 'El nombre solo puede tener letras y espacios.' });
  });

  it('exige el teléfono del cliente', () => {
    expect(
      validarReserva({ ...VALIDOS, clienteTelefono: '   ' }, { incluirMesaYCliente: true }),
    ).toEqual({ clienteTelefono: 'El teléfono del cliente es obligatorio.' });
  });

  it('exige la mesa', () => {
    expect(validarReserva({ ...VALIDOS, mesaId: '' }, { incluirMesaYCliente: true })).toEqual({
      mesaId: 'La mesa es obligatoria.',
    });
  });
});

describe('validarReserva: fecha, hora y cantidad de personas (compartido con la modificación)', () => {
  it('exige la fecha y la rechaza si es anterior a hoy', () => {
    expect(validarReserva({ ...VALIDOS, fecha: '' }, { incluirMesaYCliente: false })).toEqual({
      fecha: 'La fecha es obligatoria.',
    });
    expect(validarReserva({ ...VALIDOS, fecha: AYER }, { incluirMesaYCliente: false })).toEqual({
      fecha: 'La fecha no puede ser anterior a hoy.',
    });
  });

  it('exige la hora', () => {
    expect(validarReserva({ ...VALIDOS, hora: '' }, { incluirMesaYCliente: false })).toEqual({
      hora: 'La hora es obligatoria.',
    });
  });

  it.each(['', '0', '-1', '4.5', 'abc'])(
    'rechaza una cantidad de personas inválida: %s',
    (valor) => {
      const errores = validarReserva(
        { ...VALIDOS, cantidadPersonas: valor },
        { incluirMesaYCliente: false },
      );
      expect(errores.cantidadPersonas).toBeTruthy();
    },
  );

  it('sin incluirMesaYCliente no exige cliente ni mesa', () => {
    const datos = { ...VALIDOS, clienteNombre: '', clienteTelefono: '', mesaId: '' };
    expect(validarReserva(datos, { incluirMesaYCliente: false })).toEqual({});
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de disponibilidad bajo la mesa', () => {
    const mensaje = 'No hay mesa disponible para esa fecha y hora';
    expect(errorDelServidor(mensaje)).toEqual({ mesaId: mensaje });
  });

  it('ubica el 409 de fecha pasada bajo la fecha', () => {
    const mensaje = 'La fecha de la reserva no puede ser anterior a hoy';
    expect(errorDelServidor(mensaje)).toEqual({ fecha: mensaje });
  });

  it('cualquier otro mensaje queda como error general', () => {
    expect(errorDelServidor('La reserva 99 no existe')).toEqual({
      general: 'La reserva 99 no existe',
    });
  });
});
