import { describe, expect, it } from 'vitest';

import { errorDelServidor, validarSector } from './validarSector';

describe('validarSector', () => {
  it('acepta un nombre de 30 caracteres y una descripción vacía (CA 1)', () => {
    expect(validarSector({ nombre: 'a'.repeat(30), descripcion: '' })).toEqual({});
    expect(validarSector({ nombre: '  Terraza  ', descripcion: '  ' })).toEqual({});
  });

  it('pide el nombre cuando está vacío o solo con espacios (CA 2)', () => {
    expect(validarSector({ nombre: '   ', descripcion: '' })).toEqual({
      nombre: 'El nombre es obligatorio.',
    });
  });

  it('rechaza un nombre de 31 caracteres y acepta el de 30 (CA 5)', () => {
    expect(validarSector({ nombre: 'a'.repeat(31), descripcion: '' }).nombre).toBe(
      'El nombre supera los 30 caracteres permitidos.',
    );
    expect(validarSector({ nombre: 'a'.repeat(30), descripcion: '' })).toEqual({});
  });

  it('rechaza una descripción de 201 caracteres y acepta la de 200', () => {
    expect(validarSector({ nombre: 'Terraza', descripcion: 'a'.repeat(201) }).descripcion).toBe(
      'La descripción supera los 200 caracteres permitidos.',
    );
    expect(validarSector({ nombre: 'Terraza', descripcion: 'a'.repeat(200) })).toEqual({});
  });
});

describe('errorDelServidor', () => {
  it('ubica el 409 de nombre repetido bajo el campo Nombre (CA 3)', () => {
    expect(errorDelServidor('El sector ya existe')).toEqual({
      nombre: 'Ya existe un sector con ese nombre.',
    });
  });

  it('deja cualquier otro mensaje como error general', () => {
    expect(errorDelServidor('No se pudo conectar con el backend')).toEqual({
      general: 'No se pudo conectar con el backend',
    });
  });
});
