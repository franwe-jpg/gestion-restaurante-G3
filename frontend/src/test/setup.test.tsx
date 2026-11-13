import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';

import { useSesion } from '../shared/auth/useSesion';

import { sinSesion, usarRoles } from './sesionDePrueba';

it('el setup entrega por defecto un encargado con todos los permisos', () => {
  const { result } = renderHook(() => useSesion());

  expect(result.current.usuario?.roles).toEqual(['ENCARGADO']);
  expect(result.current.puede('REPORTES_VER')).toBe(true);
});

it('usarRoles cambia el rol solo dentro de la prueba', () => {
  usarRoles(['CHEF']);
  const { result } = renderHook(() => useSesion());

  expect(result.current.puede('CARTA_VER')).toBe(true);
  expect(result.current.puede('CARTA_GESTIONAR')).toBe(false);
});

it('despues de la prueba anterior el rol vuelve a encargado', () => {
  const { result } = renderHook(() => useSesion());

  expect(result.current.puede('CARTA_GESTIONAR')).toBe(true);
});

it('sinSesion deja usuario nulo y sin permisos', () => {
  sinSesion();
  const { result } = renderHook(() => useSesion());

  expect(result.current.usuario).toBeNull();
  expect(result.current.puede('CARTA_VER')).toBe(false);
});
