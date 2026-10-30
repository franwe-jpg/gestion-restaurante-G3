import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';

function simularBackendOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ estado: 'ok' }),
    } as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('muestra el panel de inicio sin consultar el backend', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Productos y Carta/ }).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('monta la pantalla de estado en /salud', async () => {
    simularBackendOk();

    render(
      <MemoryRouter initialEntries={['/salud']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Estado del servicio: ok')).toBeInTheDocument();
  });

  it('monta la carta en /productos/carta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
      } as Response),
    );

    render(
      <MemoryRouter initialEntries={['/productos/carta']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Carta' })).toBeInTheDocument();
  });

  it('muestra la guía de componentes', () => {
    render(
      <MemoryRouter initialEntries={['/componentes']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Guía de componentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Botones' })).toBeInTheDocument();
  });

  it('monta la lista de productos del módulo Productos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ items: [], total: 0, limit: 50, offset: 0 }),
      } as Response),
    );
    render(
      <MemoryRouter initialEntries={['/productos']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Productos y Carta' })).toBeInTheDocument();
    expect(await screen.findByText('No hay productos habilitados')).toBeInTheDocument();
  });

  it.each([
    ['/productos/platos/nuevo', 'Nuevo plato'],
    ['/productos/postres/nuevo', 'Nuevo postre'],
    ['/productos/bebidas/nuevo', 'Nueva bebida'],
    ['/productos/nuevo', 'Nuevo plato'],
  ])('monta el formulario de alta de %s con el título %s', async (ruta, titulo) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
      } as Response),
    );

    render(
      <MemoryRouter initialEntries={[ruta]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(await screen.findByText('Primero hay que crear una sección')).toBeInTheDocument();
  });

  it.each([
    ['PLATO', 'platos', 'Editar plato'],
    ['POSTRE', 'postres', 'Editar postre'],
    ['BEBIDA', 'bebidas', 'Editar bebida'],
  ] as const)('monta la pantalla de edición de %s', async (categoria, segmento, titulo) => {
    const plato = {
      id: 7,
      nombre: 'Milanesa',
      categoria,
      precio: '12500.50',
      ingredientes: ['Pan'],
      descripcion: null,
      etiquetas: [],
      estado: 'HABILITADO',
      seccion: { id: 3, nombre: 'Platos' },
      imagen_url: null,
    };
    const secciones = { items: [], total: 0, limit: 100, offset: 0 };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(url.includes(`/${segmento}/7`) ? plato : secciones),
        } as Response),
      ),
    );

    render(
      <MemoryRouter initialEntries={[`/productos/${segmento}/7/editar`]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Milanesa')).toBeInTheDocument();
  });
});
