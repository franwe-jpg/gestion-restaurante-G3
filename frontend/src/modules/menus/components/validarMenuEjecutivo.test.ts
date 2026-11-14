import { describe, expect, it } from 'vitest';

import { validarMenuEjecutivo } from './validarMenuEjecutivo';

const VALIDO = {
  nombre: 'Almuerzo ejecutivo',
  precio_fijo: '1500.00',
  producto_ids: [1],
  seccion_id: '2',
  descripcion: 'Incluye bebida',
};

describe('validarMenuEjecutivo', () => {
  it('acepta una alta completa válida', () => {
    expect(validarMenuEjecutivo(VALIDO)).toEqual({});
  });

  it('indica cada obligatorio ausente', () => {
    expect(
      validarMenuEjecutivo({
        ...VALIDO,
        nombre: ' ',
        precio_fijo: '',
        producto_ids: [],
        seccion_id: '',
      }),
    ).toEqual({
      nombre: 'El nombre es obligatorio.',
      precio_fijo: 'El precio fijo debe ser mayor que cero.',
      producto_ids: 'Incluí al menos un producto.',
      seccion_id: 'Elegí una sección habilitada.',
    });
  });

  it('rechaza precios no positivos o con más de dos decimales', () => {
    expect(validarMenuEjecutivo({ ...VALIDO, precio_fijo: '0' }).precio_fijo).toBe(
      'El precio fijo debe ser mayor que cero.',
    );
    expect(validarMenuEjecutivo({ ...VALIDO, precio_fijo: '1.001' }).precio_fijo).toBe(
      'El precio admite hasta dos decimales.',
    );
  });

  it('recorta el nombre al validar el límite', () => {
    expect(validarMenuEjecutivo({ ...VALIDO, nombre: ` ${'a'.repeat(101)} ` }).nombre).toBe(
      'El nombre supera los 100 caracteres permitidos.',
    );
  });
});
