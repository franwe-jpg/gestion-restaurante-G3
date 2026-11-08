import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import {
  descargarComprobantePdf,
  listarMediosPago,
  obtenerComprobante,
  obtenerFactura,
} from '../api';
import type { Comprobante, Factura, FacturaResumen, MedioPago } from '../types';

import { ComprobantesDialog } from './ComprobantesDialog';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const TARJETA: MedioPago = { ...EFECTIVO, id: 2, nombre: 'Tarjeta', tipo: 'TARJETA' };

const RESUMEN: FacturaResumen = {
  id: 7,
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  saldo_pendiente: '0.00',
  estado: 'PAGADA',
};

const FACTURA: Factura = {
  ...RESUMEN,
  detalles: [],
  cobros: [
    {
      id: 3,
      numero_comprobante: 3,
      monto: '5000.00',
      fecha_hora: '2026-11-05T15:00:00Z',
      medio_pago_id: 1,
    },
    {
      id: 4,
      numero_comprobante: 4,
      monto: '2101.00',
      fecha_hora: '2026-11-05T16:00:00Z',
      medio_pago_id: 2,
    },
  ],
};

const COMPROBANTE: Comprobante = {
  numero_comprobante: 4,
  fecha_hora: '2026-11-05T16:00:00Z',
  monto: '2101.00',
  medio_pago: { id: 2, nombre: 'Tarjeta', tipo: 'TARJETA' },
  cobro_id: 4,
  factura_id: 7,
  comanda_id: 12,
  total_factura: '7101.00',
  saldo_pendiente: '0.00',
};

function abrir() {
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ComprobantesDialog factura={RESUMEN} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return onOpenChange;
}

async function verComprobante(numero: number) {
  fireEvent.click(await screen.findByRole('button', { name: `Ver el comprobante ${numero}` }));
  await screen.findByText('Comprobante N° 4');
}

beforeEach(() => {
  vi.mocked(obtenerFactura).mockResolvedValue({ datos: FACTURA, exito: true });
  vi.mocked(listarMediosPago).mockResolvedValue({
    datos: { items: [EFECTIVO, TARJETA], total: 2, limit: 100, offset: 0 },
    exito: true,
  });
  vi.mocked(obtenerComprobante).mockResolvedValue({ datos: COMPROBANTE, exito: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ComprobantesDialog (HU-M6-03)', () => {
  it('lista un comprobante por cada cobro de la factura', async () => {
    abrir();

    expect(await screen.findByText('Comprobantes de la factura #7')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ver el comprobante 3' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ver el comprobante 4' })).toBeEnabled();
    expect(screen.getByText('$ 5000.00')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Tarjeta')).toBeInTheDocument());
  });

  it('muestra el número, la fecha, el importe, el medio, la factura y la comanda (CA1, CA2)', async () => {
    abrir();
    await verComprobante(4);

    expect(obtenerComprobante).toHaveBeenCalledWith(4);
    expect(screen.getByText('$ 2101.00')).toBeInTheDocument();
    expect(screen.getByText('Tarjeta')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
  });

  it('avisa cuando no hay un pago registrado con ese comprobante (CA3)', async () => {
    vi.mocked(obtenerComprobante).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No hay un pago registrado con el comprobante 4',
    });
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver el comprobante 4' }));

    expect(
      await screen.findByText('No hay un pago registrado con el comprobante 4'),
    ).toBeInTheDocument();
  });

  it('vuelve a la lista y muestra el mismo comprobante al pedirlo otra vez (CA4)', async () => {
    abrir();
    await verComprobante(4);

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    await verComprobante(4);

    expect(obtenerComprobante).toHaveBeenNthCalledWith(1, 4);
    expect(obtenerComprobante).toHaveBeenNthCalledWith(2, 4);
  });
});

describe('ComprobantesDialog: PDF y errores (HU-M6-03)', () => {
  it('descarga el PDF del comprobante', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    vi.mocked(descargarComprobantePdf).mockResolvedValue({ datos: blob, exito: true });
    abrir();
    await verComprobante(4);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    await waitFor(() => expect(guardarArchivo).toHaveBeenCalledWith(blob, 'comprobante-4.pdf'));
  });

  it('avisa si no se pudo descargar el PDF', async () => {
    vi.mocked(descargarComprobantePdf).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    abrir();
    await verComprobante(4);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
    expect(guardarArchivo).not.toHaveBeenCalled();
  });

  it('muestra el error si la factura no se pudo cargar', async () => {
    vi.mocked(obtenerFactura).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La factura 7 no existe',
    });
    abrir();

    expect(await screen.findByText('La factura 7 no existe')).toBeInTheDocument();
  });

  it('se cierra con «Cerrar»', async () => {
    const onOpenChange = abrir();
    await screen.findByRole('button', { name: 'Ver el comprobante 3' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' }).at(-1)!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
