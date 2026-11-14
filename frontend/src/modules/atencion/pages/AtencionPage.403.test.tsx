import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { leerToken, guardarToken } from '../../../shared/auth/almacenSesion';
import { SesionProvider } from '../../../shared/auth/SesionProvider';
import { useSesion } from '../../../shared/auth/useSesion';
import { ConfirmProvider } from '../../../shared/components/ui/confirm-dialog';

import { AtencionPage } from './AtencionPage';

// Esta prueba usa el proveedor de sesión real y el cliente HTTP real; solo `fetch` es falso.
vi.unmock('../../../shared/auth/useSesion');

const MENSAJE_403 = 'No tiene permiso para realizar esta acción';

function respuesta(cuerpo: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    statusText: '',
    json: () => Promise.resolve(cuerpo),
  } as Response;
}

function simularApi() {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/sesion')) {
      return Promise.resolve(
        respuesta({ id: 1, correo: 'm@resto.com', roles: ['MOZO'], nombre: null, apellido: null }),
      );
    }
    if (url.includes('/anular') && init?.method === 'POST') {
      return Promise.resolve(respuesta({ detalle: MENSAJE_403 }, 403));
    }
    if (url.includes('/comandas?')) {
      return Promise.resolve(
        respuesta({
          items: [{ id: 3, mesa_id: 7, estado: 'ABIERTA', fecha_hora: '2026-10-31T12:30:00Z' }],
          total: 1,
          limit: 50,
          offset: 0,
        }),
      );
    }
    return Promise.resolve(respuesta({ items: [], total: 0, limit: 50, offset: 0 }));
  });
}

function EstadoDeSesion() {
  const { usuario } = useSesion();
  return <p>{usuario ? `Sesión de ${usuario.correo}` : 'Sin sesión'}</p>;
}

beforeEach(() => {
  guardarToken('tok-1');
  vi.stubGlobal('fetch', simularApi());
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it('ante un 403 inesperado muestra el detalle y conserva la sesión (CA-2)', async () => {
  render(
    <MemoryRouter>
      <SesionProvider>
        <ConfirmProvider>
          <EstadoDeSesion />
          <AtencionPage />
        </ConfirmProvider>
      </SesionProvider>
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Anular comanda #3' }));

  fireEvent.click(screen.getByRole('button', { name: 'Anular comanda' }));

  expect(await screen.findByText(MENSAJE_403)).toBeInTheDocument();
  expect(screen.getByText('Sesión de m@resto.com')).toBeInTheDocument();
  expect(leerToken()).toBe('tok-1');
});
