import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { sinSesion, usarRoles } from './test/sesionDePrueba';

let fetchMock: ReturnType<typeof vi.fn>;

function urlsPedidas(): string[] {
  return fetchMock.mock.calls.map((llamada) => String(llamada[0]));
}

function renderizar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rutas sin sesión', () => {
  it('una ruta protegida lleva a /login y no hace ninguna llamada de datos', async () => {
    sinSesion();
    renderizar('/pagos');

    expect(await screen.findByRole('heading', { name: 'Ingresá al sistema' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Módulos del restaurante' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('/login se muestra fuera del menú lateral y del encabezado', () => {
    sinSesion();
    renderizar('/login');

    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('con sesión, /login lleva al inicio', () => {
    usarRoles(['ENCARGADO']);
    renderizar('/login');

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  });
});

describe('rutas por rol', () => {
  it('el chef que abre /pagos por URL va al inicio y no se llama a pagos', async () => {
    usarRoles(['CHEF']);
    renderizar('/pagos');

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
    expect(urlsPedidas().some((url) => /facturas|medios-de-pago/.test(url))).toBe(false);
  });

  it('el chef que abre /salon va al inicio', () => {
    usarRoles(['CHEF']);
    renderizar('/salon');

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  });

  it('el mozo que abre un reporte va al inicio', () => {
    usarRoles(['MOZO']);
    renderizar('/reportes/mesas-ventas-por-mozo');

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  });

  it('el mozo que abre /reportes va al inicio', () => {
    usarRoles(['MOZO']);
    renderizar('/reportes');

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  });

  it('el encargado entra a /reportes', () => {
    usarRoles(['ENCARGADO']);
    renderizar('/reportes');

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
  });

  it('el mozo entra a /pagos', async () => {
    usarRoles(['MOZO']);
    renderizar('/pagos');

    expect(await screen.findByRole('heading', { name: 'Pagos' })).toBeInTheDocument();
  });

  it('el chef entra a /reservas y /productos/carta', async () => {
    usarRoles(['CHEF']);
    renderizar('/productos/carta');

    expect(await screen.findByRole('heading', { name: 'Carta' })).toBeInTheDocument();
  });
});
