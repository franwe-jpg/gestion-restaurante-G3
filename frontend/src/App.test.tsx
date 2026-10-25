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

  it('muestra la guía de componentes', () => {
    render(
      <MemoryRouter initialEntries={['/componentes']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Guía de componentes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Botones' })).toBeInTheDocument();
  });

  it('monta una pantalla placeholder de modulo', async () => {
    render(
      <MemoryRouter initialEntries={['/productos']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Productos y Carta' })).toBeInTheDocument();
    expect(screen.getByText('Módulo pendiente de implementación')).toBeInTheDocument();
  });

  it('monta el formulario de alta de platos en /productos/nuevo', async () => {
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
      <MemoryRouter initialEntries={['/productos/nuevo']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Nuevo plato' })).toBeInTheDocument();
    expect(await screen.findByText('Primero hay que crear una sección')).toBeInTheDocument();
  });
});
