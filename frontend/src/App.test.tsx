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

  it('monta la pantalla del reporte de mas vendidos', async () => {
    render(
      <MemoryRouter initialEntries={['/reportes/productos-mas-vendidos']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Productos más vendidos' }),
    ).toBeInTheDocument();
  });

  it('en la pantalla del reporte el menu lateral marca Reportes como activo', async () => {
    render(
      <MemoryRouter initialEntries={['/reportes/productos-mas-vendidos']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Productos más vendidos' });
    const enlaces = screen.getAllByRole('link', { name: /Reportes/ });
    expect(enlaces.some((e) => e.getAttribute('aria-current') === 'page')).toBe(true);
    expect(screen.getByRole('link', { name: /Productos y Carta/ })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('monta la pagina compartida de reportes', () => {
    render(
      <MemoryRouter initialEntries={['/reportes']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
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
});
