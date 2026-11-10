import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import { EstadoDeCaja } from './EstadoDeCaja';
import type { CajaDelDia } from './types';

vi.mock('./api', () => ({
  obtenerMapaDelLocal: vi.fn(),
  obtenerCajaDelDia: vi.fn(),
  hoyLocal: () => '2026-11-09',
}));

const CAJA: CajaDelDia = {
  fecha: '2026-11-09',
  por_medio_pago: [
    {
      medio_pago_id: 1,
      nombre: 'Efectivo',
      tipo: 'EFECTIVO',
      cantidad_cobros: 2,
      monto: '1500.00',
    },
    { medio_pago_id: 2, nombre: 'Tarjeta', tipo: 'TARJETA', cantidad_cobros: 1, monto: '2000.00' },
  ],
  total_cobrado: '3500.00',
  adeudado: { cantidad_facturas: 2, monto: '500.50' },
};

function renderizar() {
  render(
    <MemoryRouter>
      <EstadoDeCaja />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({ exito: true, datos: CAJA });
});

describe('EstadoDeCaja', () => {
  it('muestra el indicador de carga hasta recibir datos', () => {
    vi.mocked(api.obtenerCajaDelDia).mockReturnValue(new Promise(() => undefined));

    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  });

  it('lista los medios con su monto, el total, lo adeudado y el enlace a Pagos', async () => {
    renderizar();

    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText(/\$\s*1\.500,00/)).toBeInTheDocument();
    expect(screen.getByText('Tarjeta')).toBeInTheDocument();
    expect(screen.getByText(/\$\s*2\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*3\.500,00/)).toBeInTheDocument();
    expect(screen.getByText('2 facturas adeudadas')).toBeInTheDocument();
    expect(screen.getByText(/\$\s*500,50/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Pagos' })).toHaveAttribute('href', '/pagos');
  });

  it('usa el singular con una sola factura adeudada', async () => {
    vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({
      exito: true,
      datos: { ...CAJA, adeudado: { cantidad_facturas: 1, monto: '10.00' } },
    });

    renderizar();

    expect(await screen.findByText('1 factura adeudada')).toBeInTheDocument();
  });

  it('sin cobros muestra «Todavía no hay cobros hoy», el total en cero y mantiene el enlace', async () => {
    vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({
      exito: true,
      datos: { ...CAJA, por_medio_pago: [], total_cobrado: '0.00' },
    });

    renderizar();

    expect(await screen.findByText('Todavía no hay cobros hoy')).toBeInTheDocument();
    expect(
      screen.getByText(/\$\s*0,00/, { selector: '[data-testid="total-cobrado"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 facturas adeudadas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Pagos' })).toBeInTheDocument();
  });

  it('sin deuda muestra «No hay facturas adeudadas»', async () => {
    vi.mocked(api.obtenerCajaDelDia).mockResolvedValue({
      exito: true,
      datos: { ...CAJA, adeudado: { cantidad_facturas: 0, monto: '0.00' } },
    });

    renderizar();

    expect(await screen.findByText('No hay facturas adeudadas')).toBeInTheDocument();
  });

  it('ante un error muestra el detalle con «Reintentar», que recarga', async () => {
    vi.mocked(api.obtenerCajaDelDia)
      .mockResolvedValueOnce({ exito: false, datos: null, error: 'Falla de caja' })
      .mockResolvedValueOnce({ exito: true, datos: CAJA });

    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falla de caja');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Efectivo')).toBeInTheDocument();
  });
});
