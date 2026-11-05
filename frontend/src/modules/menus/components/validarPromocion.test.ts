import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarPromocion } from './validarPromocion';
import type { DatosFormularioPromocion } from './validarPromocion';

const VALIDO: DatosFormularioPromocion = {
  nombre: 'Happy hour',
  tipo: 'PORCENTAJE',
  descripcion: 'Descuento de tarde',
  producto_ids: [1],
  fecha_desde: '2026-11-01',
  fecha_hasta: '2026-11-30',
  dias_semana: ['LUNES', 'MARTES'],
  hora_desde: '17:00',
  hora_hasta: '20:30',
  descuento_porcentaje: '15',
  precio_fijo: '',
  cant_lleva: '',
  cant_paga: '',
};

const FIJO: DatosFormularioPromocion = {
  ...VALIDO,
  tipo: 'PRECIO_FIJO',
  descuento_porcentaje: '',
  precio_fijo: '1500.00',
};

const NXM: DatosFormularioPromocion = {
  ...VALIDO,
  tipo: 'NXM',
  descuento_porcentaje: '',
  cant_lleva: '2',
  cant_paga: '1',
};

describe('validarPromocion: datos generales', () => {
  it('acepta los tres tipos con datos válidos y la franja vacía', () => {
    expect(validarPromocion(VALIDO)).toEqual({});
    expect(validarPromocion(FIJO)).toEqual({});
    expect(validarPromocion(NXM)).toEqual({});
    expect(validarPromocion({ ...VALIDO, hora_desde: '', hora_hasta: '' })).toEqual({});
  });

  it('exige nombre y limita su longitud', () => {
    expect(validarPromocion({ ...VALIDO, nombre: ' ' }).nombre).toBe('El nombre es obligatorio.');
    expect(validarPromocion({ ...VALIDO, nombre: 'x'.repeat(101) }).nombre).toBe(
      'El nombre supera los 100 caracteres permitidos.',
    );
  });

  it('exige productos y al menos un día', () => {
    expect(validarPromocion({ ...VALIDO, producto_ids: [] }).producto_ids).toBe(
      'Elegí al menos un producto.',
    );
    expect(validarPromocion({ ...VALIDO, dias_semana: [] }).dias_semana).toBe(
      'Elegí al menos un día.',
    );
  });

  it('valida la vigencia y la franja horaria', () => {
    expect(validarPromocion({ ...VALIDO, fecha_desde: '' }).fecha_desde).toBe(
      'La fecha desde es obligatoria.',
    );
    expect(validarPromocion({ ...VALIDO, fecha_hasta: '' }).fecha_hasta).toBe(
      'La fecha hasta es obligatoria.',
    );
    expect(validarPromocion({ ...VALIDO, fecha_hasta: '2026-10-31' }).fecha_hasta).toBe(
      'La fecha hasta no puede ser anterior a la fecha desde.',
    );
    expect(validarPromocion({ ...VALIDO, hora_desde: '' }).hora_desde).toBe(
      'Completá la hora desde o dejá la franja vacía.',
    );
    expect(validarPromocion({ ...VALIDO, hora_hasta: '' }).hora_hasta).toBe(
      'Completá la hora hasta o dejá la franja vacía.',
    );
    expect(validarPromocion({ ...VALIDO, hora_hasta: '17:00' }).hora_hasta).toBe(
      'La hora hasta debe ser posterior a la hora desde.',
    );
  });
});

describe('validarPromocion: campos por tipo', () => {
  it('valida el porcentaje entero entre 1 y 100', () => {
    for (const valor of ['', '0', '101', '1.5']) {
      expect(
        validarPromocion({ ...VALIDO, descuento_porcentaje: valor }).descuento_porcentaje,
      ).toBe(
        valor === ''
          ? 'El descuento es obligatorio.'
          : 'El descuento debe ser un número entero entre 1 y 100.',
      );
    }
  });

  it('valida el precio fijo positivo y con hasta dos decimales', () => {
    for (const valor of ['', '0', '-1', '1.001']) {
      expect(validarPromocion({ ...FIJO, precio_fijo: valor }).precio_fijo).toBe(
        valor === ''
          ? 'El precio fijo es obligatorio.'
          : 'El precio fijo debe ser mayor que cero y tener hasta dos decimales.',
      );
    }
  });

  it('valida las cantidades NxM y que paga sea menor que lleva', () => {
    expect(validarPromocion({ ...NXM, cant_lleva: '' }).cant_paga).toBe(
      'La cantidad que lleva debe ser un entero mayor que cero.',
    );
    expect(validarPromocion({ ...NXM, cant_paga: '' }).cant_paga).toBe(
      'La cantidad que paga debe ser un entero mayor que cero.',
    );
    expect(validarPromocion({ ...NXM, cant_lleva: '1', cant_paga: '2' }).cant_paga).toBe(
      'La cantidad que paga debe ser menor que la cantidad que lleva.',
    );
    expect(validarPromocion({ ...NXM, cant_lleva: '2', cant_paga: '2' }).cant_paga).toBe(
      'La cantidad que paga debe ser menor que la cantidad que lleva.',
    );
  });

  it('limita la descripción a 500 caracteres', () => {
    expect(validarPromocion({ ...VALIDO, descripcion: 'x'.repeat(501) }).descripcion).toBe(
      'La descripción supera los 500 caracteres permitidos.',
    );
  });
});

describe('errorDelServidor', () => {
  it('ubica el nombre repetido en el campo nombre', () => {
    expect(errorDelServidor('El nombre de la promoción ya existe')).toEqual({
      nombre: 'Ya existe una promoción con ese nombre.',
    });
  });

  it('ubica los demás mensajes en su campo', () => {
    expect(errorDelServidor('El producto 3 no existe')).toEqual({
      producto_ids: 'El producto 3 no existe',
    });
    expect(errorDelServidor('La fecha hasta es inválida')).toEqual({
      fecha_hasta: 'La fecha hasta es inválida',
    });
    expect(errorDelServidor('La hora hasta es inválida')).toEqual({
      hora_hasta: 'La hora hasta es inválida',
    });
    expect(errorDelServidor('Elegí al menos un día')).toEqual({
      dias_semana: 'Elegí al menos un día',
    });
    expect(errorDelServidor('El descuento es inválido')).toEqual({
      descuento_porcentaje: 'El descuento es inválido',
    });
    expect(errorDelServidor('El precio fijo es inválido')).toEqual({
      precio_fijo: 'El precio fijo es inválido',
    });
    expect(errorDelServidor('La cantidad que paga es inválida')).toEqual({
      cant_paga: 'La cantidad que paga es inválida',
    });
    expect(errorDelServidor('Error inesperado')).toEqual({ general: 'Error inesperado' });
  });
});
