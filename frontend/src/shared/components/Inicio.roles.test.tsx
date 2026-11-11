import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usarRoles } from '../../test/sesionDePrueba';

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
  vi.mocked(api.obtenerMapaDelLocal).mockResolvedValue({ exito: true, datos: [] });
  vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({ exito: true, datos: CAJA });
});

describe('Inicio: según el rol', () => {
  it('el encargado ve los dos accesos, el mapa y la caja', async () => {
    usarRoles(['ENCARGADO']);
    renderizar();

    expect(screen.getByRole('link', { name: 'Nueva comanda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(await screen.findByText('No hay mesas registradas')).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay cobros hoy')).toBeInTheDocument();
  });

  it('el mozo ve los accesos y el mapa, pero no la caja ni la solicita', async () => {
    usarRoles(['MOZO']);
    renderizar();

    expect(screen.getByRole('link', { name: 'Nueva comanda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(await screen.findByText('No hay mesas registradas')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no hay cobros hoy')).not.toBeInTheDocument();
    expect(api.obtenerCajaDelDia).not.toHaveBeenCalled();
  });

  it('el chef no ve accesos de operación, ni mapa, ni caja y no solicita nada', async () => {
    usarRoles(['CHEF']);
    renderizar();

    expect(screen.getByRole('heading', { name: 'Panel de Administración' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nueva comanda' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nueva reserva' })).not.toBeInTheDocument();
    expect(screen.getByText(/Elegí un módulo del menú lateral/)).toBeInTheDocument();
    await waitFor(() => expect(api.obtenerMapaDelLocal).not.toHaveBeenCalled());
    expect(api.obtenerCajaDelDia).not.toHaveBeenCalled();
  });
});
