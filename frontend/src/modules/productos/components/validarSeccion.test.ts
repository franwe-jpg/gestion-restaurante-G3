import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarSeccion } from './validarSeccion';

describe('validarSeccion', () => {
  it('acepta un nombre y un orden validos', () => {
    expect(validarSeccion({ nombre: 'Entradas', orden: '1' })).toEqual({});
  });

  it('pide nombre y orden cuando estan vacios (CA 2)', () => {
    expect(validarSeccion({ nombre: '   ', orden: '' })).toEqual({
      nombre: 'El nombre es obligatorio.',
      orden: 'El orden es obligatorio.',
    });
  });

  it('rechaza un nombre de mas de 50 caracteres tras quitar espacios (CA 4)', () => {
    expect(validarSeccion({ nombre: 'a'.repeat(51), orden: '1' }).nombre).toBe(
      'El nombre supera los 50 caracteres permitidos.',
    );
    expect(validarSeccion({ nombre: ` ${'a'.repeat(50)} `, orden: '1' })).toEqual({});
  });

  it.each(['0', '-1', '2.5', 'abc', '1e2'])('rechaza el orden %s (CA 5)', (orden) => {
    expect(validarSeccion({ nombre: 'Entradas', orden }).orden).toBe(
      'El orden debe ser un número entero mayor a cero.',
    );
  });
});

describe('errorDelServidor', () => {
  it('asigna el conflicto de nombre al campo nombre (CA 3)', () => {
    expect(errorDelServidor('La sección ya existe')).toEqual({
      nombre: 'Ya existe una sección con ese nombre.',
    });
  });

  it('asigna el conflicto de posición al campo orden (CA 6)', () => {
    expect(errorDelServidor('Posición ocupada: otra sección habilitada usa ese orden')).toEqual({
      orden: 'Esa posición está ocupada por otra sección habilitada.',
    });
  });

  it('deja cualquier otro mensaje como error general', () => {
    expect(errorDelServidor('El producto Flan está deshabilitado')).toEqual({
      general: 'El producto Flan está deshabilitado',
    });
  });
});
