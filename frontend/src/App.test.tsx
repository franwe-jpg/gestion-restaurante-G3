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
  it('muestra el panel de inicio con los accesos rápidos, el mapa y la caja', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () =>
            Promise.resolve(
              url.includes('/reportes/caja-del-dia')
                ? {
                    fecha: '2026-11-09',
                    por_medio_pago: [],
                    total_cobrado: '0.00',
                    adeudado: { cantidad_facturas: 0, monto: '0.00' },
                  }
                : { items: [], total: 0, limit: 100, offset: 0 },
            ),
        } as Response),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva comanda' })).toBeInTheDocument();
    expect(await screen.findByText('No hay mesas registradas')).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay cobros hoy')).toBeInTheDocument();
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
