import { afterEach, expect, it } from 'vitest';

import { borrarToken, guardarToken, leerToken } from './almacenSesion';

afterEach(() => {
  sessionStorage.clear();
});

it('sin token guardado devuelve null', () => {
  expect(leerToken()).toBeNull();
});

it('guarda el token en sessionStorage y lo lee', () => {
  guardarToken('abc123');

  expect(leerToken()).toBe('abc123');
  expect(sessionStorage.length).toBe(1);
  expect(localStorage.length).toBe(0);
});

it('borrarToken lo elimina', () => {
  guardarToken('abc123');

  borrarToken();

  expect(leerToken()).toBeNull();
});
