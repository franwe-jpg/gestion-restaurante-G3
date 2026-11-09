import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastProvider } from '../../../shared/components/ui/toast';
import {
  eliminarMedioPago,
  listarFacturas,
  listarMediosPago,
  obtenerFactura,
  previsualizarFactura,
} from '../api';
import type { Factura, FacturaResumen, MedioPago } from '../types';

import { PagosPage } from './PagosPage';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const FACTURA_RESUMEN: FacturaResumen = {
  id: 7,
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  saldo_pendiente: '6101.00',
  estado: 'ADEUDADA',
};

const FACTURA: Factura = { ...FACTURA_RESUMEN, detalles: [], cobros: [] };

const confirmar = vi.fn();

function pagina(items: MedioPago[]) {
  return { datos: { items, total: items.length, limit: 50, offset: 0 }, exito: true };
}

function UbicacionActual() {
  const ubicacion = useLocation();
  return <p data-testid="ubicacion">{ubicacion.pathname + ubicacion.search}</p>;
}

function mostrar(ruta = '/pagos') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ConfirmContext.Provider value={confirmar}>
        <ToastProvider>
          <PagosPage />
          <UbicacionActual />
        </ToastProvider>
      </ConfirmContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(listarMediosPago).mockResolvedValue(pagina([EFECTIVO]));
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('PagosPage', () => {
  it('abre el diálogo para facturar una comanda (HU-M6-01)', async () => {
    mostrar();
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });

    fireEvent.click(screen.getByRole('button', { name: 'Facturar comanda' }));

    expect(screen.getByText('N° de comanda')).toBeInTheDocument();
  });

  it('muestra el encabezado de la maqueta y los medios habilitados (CA 1 de #77)', async () => {
    mostrar();

    expect(screen.getByRole('heading', { name: 'Pagos' })).toBeInTheDocument();
    expect(screen.getByText('Formas de cobro que acepta el local.')).toBeInTheDocument();
    expect(await screen.findByText('Efectivo', { selector: 'span.font-medium' })).toBeVisible();
    expect(listarMediosPago).toHaveBeenCalledWith(50, 0, false);
  });

  it('sin medios habilitados informa que no hay con qué cobrar (CA 3 de #77)', async () => {
    vi.mocked(listarMediosPago).mockResolvedValue(pagina([]));
    mostrar();

    expect(
      await screen.findByText('No hay medios de pago disponibles para cobrar.'),
    ).toBeInTheDocument();
  });

  it('la casilla «Mostrar deshabilitados» pide también los deshabilitados (S2)', async () => {
    mostrar();
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });

    fireEvent.click(screen.getByLabelText('Mostrar deshabilitados'));

    await waitFor(() => expect(listarMediosPago).toHaveBeenCalledWith(50, 0, true));
  });

  it('abre el diálogo de alta con «Nuevo medio de pago»', () => {
    mostrar();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo medio de pago' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('abre el diálogo de edición desde la fila', async () => {
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar «Efectivo»' }));

    expect(screen.getByText('Editar medio de pago')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Efectivo');
  });

  it('eliminar con confirmación recarga el listado (CA 1 de #76)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMedioPago).mockResolvedValue({ datos: null, exito: true });
    mostrar();

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar «Efectivo»' }));

    await waitFor(() => expect(eliminarMedioPago).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listarMediosPago).toHaveBeenCalledTimes(2));
  });
});

describe('PagosPage · facturas (HU-M6-02)', () => {
  it('muestra la pestaña Facturas y abre el cobro de una adeudada (HU-M6-02)', async () => {
    vi.mocked(listarFacturas).mockResolvedValue({
      datos: { items: [FACTURA_RESUMEN], total: 1, limit: 50, offset: 0 },
      exito: true,
    });
    vi.mocked(obtenerFactura).mockResolvedValue({ datos: FACTURA, exito: true });
    mostrar();
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });

    fireEvent.click(screen.getByRole('tab', { name: 'Facturas' }));

    expect(await screen.findByText('Adeudada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cobrar la factura 7' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cobrar factura #7')).toBeInTheDocument();
  });
});

describe('PagosPage · enlace desde Atención (S4-03)', () => {
  it('?comanda=12 abre «Facturar» con la vista previa y limpia el parámetro (E08)', async () => {
    vi.mocked(previsualizarFactura).mockResolvedValue({
      exito: true,
      datos: {
        comanda_id: 12,
        fecha_emision: '2026-11-05T15:00:00Z',
        total: '7101.00',
        detalles: [],
      },
    });
    mostrar('/pagos?comanda=12');
    expect(await screen.findByText(/Total a pagar/)).toBeInTheDocument();
    expect(previsualizarFactura).toHaveBeenCalledWith(12);
    expect(screen.getByTestId('ubicacion')).toHaveTextContent(/^\/pagos$/);
  });

  it('?comanda=abc se ignora: sin diálogo ni error (E10)', async () => {
    mostrar('/pagos?comanda=abc');
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(previsualizarFactura).not.toHaveBeenCalled();
  });

  it('el botón de Pagos sin parámetro mantiene el campo «N° de comanda» (E14)', async () => {
    mostrar();
    await screen.findByText('Efectivo', { selector: 'span.font-medium' });
    fireEvent.click(screen.getByRole('button', { name: 'Facturar comanda' }));
    expect(screen.getByLabelText(/N° de comanda/)).toHaveValue('');
  });
});
