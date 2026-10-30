import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearReserva, listarMesasDisponibles, listarReservas, modificarReserva } from '../api';
import type { MesaResumen, Reserva } from '../types';

import { ReservasPage } from './ReservasPage';

vi.mock('../api');

const HOY = new Date().toISOString().slice(0, 10);
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const MESAS: MesaResumen[] = [{ id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' }];

const RESERVA: Reserva = {
  id: 1,
  cliente_nombre: 'Ana Pérez',
  cliente_telefono: '2804000000',
  fecha: HOY,
  hora: '21:00:00',
  cantidad_personas: 4,
  mesa: { id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' },
  estado: 'ACTIVA',
};

function reservas(items: Reserva[] = []) {
  vi.mocked(listarReservas).mockResolvedValue({
    datos: { items, total: items.length, limit: 50, offset: 0 },
    exito: true,
  });
}

function mostrar() {
  return render(
    <ToastProvider>
      <ReservasPage />
    </ToastProvider>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReservasPage: encabezado y listado del día', () => {
  it('muestra el encabezado, la acción de alta y el selector de día en hoy', async () => {
    reservas();
    mostrar();

    expect(screen.getByRole('heading', { name: 'Reservas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(screen.getByLabelText('Día')).toHaveValue(HOY);
    await waitFor(() => expect(listarReservas).toHaveBeenCalledWith(HOY, 50, 0));
  });

  it('muestra las reservas del día pedido', async () => {
    reservas([RESERVA]);
    mostrar();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });

  it('al cambiar el día vuelve a pedir las reservas de ese día', async () => {
    reservas();
    mostrar();
    await waitFor(() => expect(listarReservas).toHaveBeenCalledWith(HOY, 50, 0));

    fireEvent.change(screen.getByLabelText('Día'), { target: { value: MANANA } });

    await waitFor(() => expect(listarReservas).toHaveBeenCalledWith(MANANA, 50, 0));
  });
});

describe('ReservasPage: alta', () => {
  it('abre el diálogo de alta y lo cierra sin crear nada al cancelar (CA 4)', async () => {
    reservas();
    mostrar();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('crea una reserva y la lista se vuelve a pedir (CA 1)', async () => {
    reservas();
    vi.mocked(listarMesasDisponibles).mockResolvedValue({ datos: MESAS, exito: true });
    vi.mocked(crearReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    mostrar();
    await waitFor(() => expect(listarReservas).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Ana Pérez' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '2804000000' } });
    fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: HOY } });
    fireEvent.change(screen.getByLabelText(/Hora/), { target: { value: '21:00' } });
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '4' } });
    await screen.findByLabelText(/Mesa/);
    fireEvent.change(screen.getByLabelText(/Mesa/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(listarReservas).toHaveBeenCalledTimes(2));
  });
});

describe('ReservasPage: edición', () => {
  it('abre el diálogo de edición con los datos de la fila y guarda el cambio (HU-M5-02)', async () => {
    reservas([RESERVA]);
    vi.mocked(modificarReserva).mockResolvedValue({
      datos: { ...RESERVA, cantidad_personas: 6 },
      exito: true,
    });
    mostrar();
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: /Editar la reserva de Ana Pérez/ }));
    expect(screen.getByRole('heading', { name: 'Editar reserva' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(modificarReserva).toHaveBeenCalledWith(1, expect.any(Object)));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
