import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarMedioPago } from './validarMedioPago';
import type { DatosFormularioMedioPago } from './validarMedioPago';

function datos(cambios: Partial<DatosFormularioMedioPago> = {}): DatosFormularioMedioPago {
  return { nombre: 'Efectivo', tipo: 'EFECTIVO', descripcion: '', ...cambios };
}

describe('validarMedioPago', () => {
  it('no informa errores con datos válidos', () => {
    expect(validarMedioPago(datos({ nombre: 'Tarjeta de crédito', descripcion: 'Visa' }))).toEqual(
      {},
    );
  });

  it.each(['', '   '])('exige el nombre (CA 3 de #74): «%s»', (nombre) => {
    expect(validarMedioPago(datos({ nombre })).nombre).toBe('El nombre es obligatorio.');
  });

  it.each(['ab', 'a'.repeat(51)])('controla el largo del nombre (CA 4 de #74)', (nombre) => {
    expect(validarMedioPago(datos({ nombre })).nombre).toBe(
      'El nombre debe tener entre 3 y 50 caracteres.',
    );
  });

  it.each(['Tarjeta $', 'Mercado_Pago', 'QR/Billetera'])(
    'rechaza caracteres no permitidos (CA 5 de #74): «%s»',
    (nombre) => {
      expect(validarMedioPago(datos({ nombre })).nombre).toBe(
        'El nombre solo admite letras, números, espacios, punto y guion.',
      );
    },
  );

  it.each(['Señal 2', 'Cta. Cte.', 'Pago-QR'])(
    'admite letras, números, punto y guion',
    (nombre) => {
      expect(validarMedioPago(datos({ nombre }))).toEqual({});
    },
  );

  it('exige el tipo (CA 6 de #74)', () => {
    expect(validarMedioPago(datos({ tipo: '' })).tipo).toBe('El tipo es obligatorio.');
  });

  it('limita la descripción a 200 caracteres (CA 7 de #74)', () => {
    expect(validarMedioPago(datos({ descripcion: 'a'.repeat(201) })).descripcion).toBe(
      'La descripción supera los 200 caracteres permitidos.',
    );
    expect(validarMedioPago(datos({ descripcion: 'a'.repeat(200) }))).toEqual({});
  });
});

describe('errorDelServidor', () => {
  it('ubica el nombre repetido bajo el campo Nombre (CA 2 de #74)', () => {
    expect(errorDelServidor('El medio de pago ya existe')).toEqual({
      nombre: 'El medio de pago ya existe',
    });
  });

  it('deja los demás errores como generales', () => {
    expect(errorDelServidor('El medio de pago 4 no existe')).toEqual({
      general: 'El medio de pago 4 no existe',
    });
  });
});
