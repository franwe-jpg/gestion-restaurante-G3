import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastProvider } from '../../../shared/components/ui/toast';
import { usarRoles } from '../../../test/sesionDePrueba';
import { listarFacturas, listarMediosPago } from '../api';
import type { FacturaResumen, MedioPago } from '../types';

import { PagosPage } from './PagosPage';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const FACTURA: FacturaResumen = {
  id: 7,
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  saldo_pendiente: '6101.00',
  estado: 'ADEUDADA',
};

function mostrar() {
  render(
    <MemoryRouter>
      <ConfirmContext.Provider value={vi.fn()}>
        <ToastProvider>
          <PagosPage />
        </ToastProvider>
      </ConfirmContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(listarMediosPago).mockResolvedValue({
    datos: { items: [EFECTIVO], total: 1, limit: 50, offset: 0 },
    exito: true,
  });
  vi.mocked(listarFacturas).mockResolvedValue({
    datos: { items: [FACTURA], total: 1, limit: 50, offset: 0 },
    exito: true,
  });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('Pagos: según el rol', () => {
  it('el encargado gestiona los medios de pago', async () => {
    usarRoles(['ENCARGADO']);
    mostrar();

    expect(await screen.findByText('Efectivo', { selector: 'span.font-medium' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nuevo medio de pago' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar «Efectivo»' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar «Efectivo»' })).toBeInTheDocument();
  });

  it('el mozo ve los medios de pago sin alta, edición ni baja, pero factura', async () => {
    usarRoles(['MOZO']);
    mostrar();

    expect(await screen.findByText('Efectivo', { selector: 'span.font-medium' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nuevo medio de pago' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar|Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Facturar comanda' })).toBeInTheDocument();
  });

  it('el mozo cobra una factura adeudada', async () => {
    usarRoles(['MOZO']);
    mostrar();
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });

    fireEvent.click(screen.getByRole('tab', { name: 'Facturas' }));

    expect(await screen.findByRole('button', { name: /Cobrar/ })).toBeInTheDocument();
  });
});
