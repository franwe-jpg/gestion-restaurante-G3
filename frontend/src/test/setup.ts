import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { restablecerSesion } from './sesionDePrueba';

// Todas las pruebas ven por defecto un encargado con sesion; las de `shared/auth` usan `vi.unmock`.
vi.mock('../shared/auth/useSesion', async () => {
  const { sesionActual } = await import('./sesionDePrueba');
  return { useSesion: () => sesionActual() };
});

afterEach(() => {
  cleanup();
  restablecerSesion();
});
