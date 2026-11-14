import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

import * as api from './inicio/api';
import { Inicio } from './Inicio';

vi.mock('./inicio/api', () => ({
  obtenerMapaDelLocal: vi.fn(),
  obtenerCajaDelDia: vi.fn(),
  hoyLocal: () => '2026-11-09',
}));

const CAJA = {
  fecha: '2026-11-09',
  por_medio_pago: [],
  total_cobrado: '0.00',
  adeudado: { cantidad_facturas: 0, monto: '0.00' },
};

function renderizar() {
  render(
    <MemoryRouter>
      <Inicio />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

it('muestra los accesos, el mapa y la caja', async () => {
  vi.mocked(api.obtenerMapaDelLocal).mockResolvedValue({ exito: true, datos: [] });
  vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({ exito: true, datos: CAJA });

  renderizar();

  expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nueva comanda' })).toBeInTheDocument();
  expect(await screen.findByText('No hay mesas registradas')).toBeInTheDocument();
  expect(await screen.findByText('Todavía no hay cobros hoy')).toBeInTheDocument();
});

it('si fallan los dos bloques los accesos siguen visibles y cada uno se reintenta solo', async () => {
  vi.mocked(api.obtenerMapaDelLocal).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'Falla de mesas',
  });
  vi.mocked(api.obtenerCajaDelDia)
    .mockResolvedValueOnce({ exito: false, datos: null, error: 'Falla de caja' })
    .mockResolvedValueOnce({ exito: true, datos: CAJA });

  renderizar();

  expect(await screen.findByText('Falla de mesas')).toBeInTheDocument();
  expect(await screen.findByText('Falla de caja')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nueva reserva' })).toBeInTheDocument();

  expect(screen.getAllByRole('button', { name: 'Reintentar' })).toHaveLength(2);
  const bloqueDeCaja = screen.getByText('Falla de caja').closest('[role="alert"]') as HTMLElement;
  fireEvent.click(within(bloqueDeCaja).getByRole('button', { name: 'Reintentar' }));

  expect(await screen.findByText('Todavía no hay cobros hoy')).toBeInTheDocument();
  expect(screen.getByText('Falla de mesas')).toBeInTheDocument();
  expect(api.obtenerMapaDelLocal).toHaveBeenCalledTimes(1);
});
