import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { listarMediosPago, obtenerFactura, registrarCobro } from '../api';
import type { Factura, FacturaResumen, MedioPago } from '../types';

import { CobrarFacturaDialog } from './CobrarFacturaDialog';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const TARJETA: MedioPago = {
  ...EFECTIVO,
  id: 2,
  nombre: 'Tarjeta',
  tipo: 'TARJETA',
};

const RESUMEN: FacturaResumen = {
  id: 7,
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  saldo_pendiente: '6101.00',
  estado: 'ADEUDADA',
};

const FACTURA: Factura = {
  ...RESUMEN,
  detalles: [],
  cobros: [
    {
      id: 1,
      numero_comprobante: 1,
      monto: '1000.00',
      fecha_hora: '2026-11-05T15:00:00Z',
      medio_pago_id: 1,
    },
  ],
};

function abrir() {
  const onCobrada = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <CobrarFacturaDialog factura={RESUMEN} onCobrada={onCobrada} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return { onCobrada, onOpenChange };
}

async function cargarFactura() {
  await screen.findByText('Cobros registrados');
  await screen.findByRole('option', { name: 'Tarjeta' });
}

beforeEach(() => {
  vi.mocked(listarMediosPago).mockResolvedValue({
    datos: { items: [EFECTIVO, TARJETA], total: 2, limit: 100, offset: 0 },
    exito: true,
  });
  vi.mocked(obtenerFactura).mockResolvedValue({ datos: FACTURA, exito: true });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('CobrarFacturaDialog (HU-M6-02)', () => {
  it('muestra el saldo y los cobros registrados, y deshabilita el medio ya usado', async () => {
    abrir();

    await cargarFactura();

    expect(obtenerFactura).toHaveBeenCalledWith(7);
    expect(screen.getAllByText('$ 6101.00').length).toBeGreaterThan(0);
    expect(screen.getByText('$ 1000.00')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Efectivo (ya usado)' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Tarjeta' })).toBeEnabled();
  });

  it('registra el cobro con el importe normalizado y avisa (CA1)', async () => {
    vi.mocked(registrarCobro).mockResolvedValue({
      datos: { ...FACTURA, saldo_pendiente: '3101.00' },
      exito: true,
    });
    const { onCobrada } = abrir();
    await cargarFactura();

    fireEvent.change(screen.getByLabelText(/Medio de pago/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '3000,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    await waitFor(() => expect(onCobrada).toHaveBeenCalled());
    expect(registrarCobro).toHaveBeenCalledWith(7, { medio_pago_id: 2, monto: '3000.50' });
  });
});

describe('CobrarFacturaDialog: avisos y validaciones (HU-M6-02)', () => {
  it('muestra el aviso del servidor si la factura ya está pagada (CA2)', async () => {
    vi.mocked(registrarCobro).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La factura ya está pagada',
    });
    const { onCobrada } = abrir();
    await cargarFactura();

    fireEvent.change(screen.getByLabelText(/Medio de pago/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(await screen.findByText('La factura ya está pagada')).toBeInTheDocument();
    expect(onCobrada).not.toHaveBeenCalled();
  });

  it('valida el medio y el monto antes de enviar (CA3 y CA6)', async () => {
    abrir();
    await cargarFactura();

    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(screen.getByText('Elegí un medio de pago.')).toBeInTheDocument();
    expect(
      screen.getByText('El importe no puede superar el saldo pendiente de la factura.'),
    ).toBeInTheDocument();
    expect(registrarCobro).not.toHaveBeenCalled();
  });

  it('muestra el error de carga si no puede traer la factura', async () => {
    vi.mocked(obtenerFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La factura 7 no existe',
    });
    abrir();

    expect(await screen.findByText('La factura 7 no existe')).toBeInTheDocument();
  });

  it('cierra con Cancelar sin registrar nada', () => {
    const { onOpenChange } = abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(registrarCobro).not.toHaveBeenCalled();
  });
});
