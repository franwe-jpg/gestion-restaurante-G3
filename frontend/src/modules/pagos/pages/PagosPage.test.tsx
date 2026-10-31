import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastProvider } from '../../../shared/components/ui/toast';
import { eliminarMedioPago, listarMediosPago } from '../api';
import type { MedioPago } from '../types';

import { PagosPage } from './PagosPage';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const confirmar = vi.fn();

function pagina(items: MedioPago[]) {
  return { datos: { items, total: items.length, limit: 50, offset: 0 }, exito: true };
}

function mostrar() {
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastProvider>
        <PagosPage />
      </ToastProvider>
    </ConfirmContext.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(listarMediosPago).mockResolvedValue(pagina([EFECTIVO]));
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('PagosPage', () => {
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
