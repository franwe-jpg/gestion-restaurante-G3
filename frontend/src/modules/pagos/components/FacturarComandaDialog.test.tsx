import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { generarFactura, listarMediosPago, previsualizarFactura } from '../api';
import type { Factura, FacturaPrevia, MedioPago } from '../types';

import { FacturarComandaDialog } from './FacturarComandaDialog';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const PREVIA: FacturaPrevia = {
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  detalles: [
    {
      producto_id: 3,
      menu_ejecutivo_id: null,
      descripcion: 'Milanesa',
      cantidad: 2,
      precio_unitario: '1500.50',
      descuento: '100.00',
      subtotal: '2901.00',
    },
  ],
};

const FACTURA = { id: 1, comanda_id: 12, total: '7101.00' } as Factura;

function abrir(comandaInicial?: string) {
  const onGenerada = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <FacturarComandaDialog
        onGenerada={onGenerada}
        onOpenChange={onOpenChange}
        comandaInicial={comandaInicial}
      />
    </ToastProvider>,
  );
  return { onGenerada, onOpenChange };
}

async function verFactura() {
  fireEvent.change(screen.getByLabelText(/N° de comanda/), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ver factura' }));
  await screen.findByText(/Total a pagar/);
}

beforeEach(() => {
  vi.mocked(listarMediosPago).mockResolvedValue({
    datos: { items: [EFECTIVO], total: 1, limit: 50, offset: 0 },
    exito: true,
  });
  vi.mocked(previsualizarFactura).mockResolvedValue({ datos: PREVIA, exito: true });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('FacturarComandaDialog (HU-M6-01)', () => {
  it('muestra el detalle, la fecha y el total de la comanda (CA1)', async () => {
    abrir();

    await verFactura();

    expect(previsualizarFactura).toHaveBeenCalledWith(12);
    expect(screen.getByText('Milanesa')).toBeInTheDocument();
    expect(screen.getByText('$ 2901.00')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar: $ 7101.00')).toBeInTheDocument();
    expect(screen.getByLabelText(/Importe/)).toHaveValue('7101.00');
  });

  it('confirma la factura con el primer cobro y avisa (CA2)', async () => {
    vi.mocked(generarFactura).mockResolvedValue({ datos: FACTURA, exito: true });
    const { onGenerada } = abrir();
    await verFactura();

    await screen.findByRole('option', { name: 'Efectivo' });
    fireEvent.change(screen.getByLabelText(/Medio de pago/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '1000,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(onGenerada).toHaveBeenCalled());
    expect(generarFactura).toHaveBeenCalledWith({
      comanda_id: 12,
      cobro: { medio_pago_id: 1, monto: '1000.50' },
    });
  });

  it('cierra con Cancelar sin generar nada', () => {
    const { onOpenChange } = abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(generarFactura).not.toHaveBeenCalled();
  });
});

describe('FacturarComandaDialog: avisos y validaciones (HU-M6-01)', () => {
  it('muestra el aviso del servidor si la comanda no está cerrada (CA3)', async () => {
    vi.mocked(previsualizarFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La comanda no está cerrada',
    });
    abrir();

    fireEvent.change(screen.getByLabelText(/N° de comanda/), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver factura' }));

    expect(await screen.findByText('La comanda no está cerrada')).toBeInTheDocument();
    expect(screen.queryByText(/Total a pagar/)).not.toBeInTheDocument();
  });

  it('muestra el aviso del servidor si la comanda ya fue facturada (CA5)', async () => {
    vi.mocked(generarFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La comanda ya fue facturada',
    });
    const { onGenerada } = abrir();
    await verFactura();

    await screen.findByRole('option', { name: 'Efectivo' });
    fireEvent.change(screen.getByLabelText(/Medio de pago/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('La comanda ya fue facturada')).toBeInTheDocument();
    expect(onGenerada).not.toHaveBeenCalled();
  });

  it('pide el número de comanda y no consulta si está vacío', async () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Ver factura' }));

    expect(await screen.findByText('Ingresá el número de la comanda.')).toBeInTheDocument();
    expect(previsualizarFactura).not.toHaveBeenCalled();
  });

  it('valida medio de pago e importe antes de enviar', async () => {
    abrir();
    await verFactura();

    fireEvent.change(screen.getByLabelText(/Importe/), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(screen.getByText('Elegí un medio de pago.')).toBeInTheDocument();
    expect(
      screen.getByText('El importe no puede superar el total de la factura.'),
    ).toBeInTheDocument();
    expect(generarFactura).not.toHaveBeenCalled();
  });
});

describe('FacturarComandaDialog desde el enlace de Atención (S4-03)', () => {
  it('carga la vista previa de la comanda inicial sin pedir el número (E08)', async () => {
    abrir('12');
    expect(await screen.findByText(/Total a pagar/)).toBeInTheDocument();
    expect(previsualizarFactura).toHaveBeenCalledWith(12);
    expect(screen.queryByLabelText(/N° de comanda/)).not.toBeInTheDocument();
  });

  it('una comanda inexistente muestra el 404 y permite corregir el número (E09)', async () => {
    vi.mocked(previsualizarFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'Comanda no encontrada',
    });
    abrir('99');
    expect(await screen.findByRole('alert')).toHaveTextContent('Comanda no encontrada');
    expect(screen.getByLabelText(/N° de comanda/)).toHaveValue('99');
  });

  it('una comanda ya facturada muestra el error y no genera otra factura (E11)', async () => {
    vi.mocked(previsualizarFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La comanda ya tiene factura',
    });
    abrir('12');
    expect(await screen.findByRole('alert')).toHaveTextContent('La comanda ya tiene factura');
    expect(generarFactura).not.toHaveBeenCalled();
  });

  it('sin comanda inicial sigue pidiendo el número (E14)', () => {
    abrir();
    expect(screen.getByLabelText(/N° de comanda/)).toHaveValue('');
    expect(previsualizarFactura).not.toHaveBeenCalled();
  });
});
