import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearReserva, listarMesasDisponibles, modificarReserva } from '../api';
import type { MesaResumen, Reserva } from '../types';

import { ReservaFormDialog } from './ReservaFormDialog';

vi.mock('../api');

const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const MESAS: MesaResumen[] = [
  { id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' },
  { id: 3, numero: 1, capacidad: 2, sector_nombre: 'Salón principal' },
];

const RESERVA: Reserva = {
  id: 1,
  cliente_nombre: 'Ana Pérez',
  cliente_telefono: '2804000000',
  fecha: MANANA,
  hora: '21:00:00',
  cantidad_personas: 4,
  mesa: { id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' },
  estado: 'ACTIVA',
};

function mesasDisponibles(mesas: MesaResumen[] = MESAS) {
  vi.mocked(listarMesasDisponibles).mockResolvedValue({ datos: mesas, exito: true });
}

async function abrir(propiedades: Partial<{ reserva: Reserva | null }> = {}) {
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ReservaFormDialog
        reserva={propiedades.reserva ?? null}
        onGuardado={onGuardado}
        onOpenChange={onOpenChange}
      />
    </ToastProvider>,
  );
  await screen.findByLabelText(/Fecha/);
  return { onGuardado, onOpenChange };
}

function completarFechaYHora(fecha = MANANA, hora = '21:00') {
  fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: fecha } });
  fireEvent.change(screen.getByLabelText(/Hora/), { target: { value: hora } });
}

async function completarAlta() {
  fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '2804000000' } });
  completarFechaYHora();
  fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '4' } });
  await screen.findByLabelText(/Mesa/);
  fireEvent.change(screen.getByLabelText(/Mesa/), { target: { value: '2' } });
}

function guardar(nombre: string) {
  fireEvent.click(screen.getByRole('button', { name: nombre }));
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReservaFormDialog: alta, selector de mesas', () => {
  it('antes de cargar fecha y hora no busca mesas y pide completarlas', async () => {
    await abrir();

    expect(screen.getByText(/Cargá la fecha y la hora/)).toBeInTheDocument();
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });

  it('al cargar fecha y hora busca las mesas disponibles para ese horario', async () => {
    mesasDisponibles();
    await abrir();

    completarFechaYHora();

    await waitFor(() => expect(listarMesasDisponibles).toHaveBeenCalledWith(MANANA, '21:00'));
    expect(await screen.findByRole('option', { name: /Terraza · Mesa 5/ })).toBeInTheDocument();
  });

  it('sin mesas disponibles avisa y deshabilita Guardar reserva', async () => {
    mesasDisponibles([]);
    await abrir();

    completarFechaYHora();

    expect(await screen.findByText('No hay mesas disponibles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeDisabled();
  });
});

describe('ReservaFormDialog: alta, validación y envío', () => {
  it('con los campos vacíos no envía y marca los obligatorios (CA 2)', async () => {
    await abrir();

    guardar('Guardar reserva');

    expect(screen.getByText('El nombre del cliente es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El teléfono del cliente es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La fecha es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('La hora es obligatoria.')).toBeInTheDocument();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('crea la reserva con los datos cargados y avisa (CA 1)', async () => {
    mesasDisponibles();
    vi.mocked(crearReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    const { onGuardado } = await abrir();
    await completarAlta();

    guardar('Guardar reserva');

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearReserva).toHaveBeenCalledWith({
      cliente_nombre: 'Ana Pérez',
      cliente_telefono: '2804000000',
      fecha: MANANA,
      hora: '21:00',
      cantidad_personas: 4,
      mesa_id: 2,
    });
    expect(await screen.findByText('Reserva creada')).toBeInTheDocument();
  });
});

describe('ReservaFormDialog: alta, errores y cancelar', () => {
  it('muestra el 409 de mesa no disponible bajo la mesa (CA 6)', async () => {
    mesasDisponibles();
    const mensaje = 'No hay mesa disponible para esa fecha y hora';
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { onGuardado } = await abrir();
    await completarAlta();

    guardar('Guardar reserva');

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('al cancelar cierra sin enviar ninguna solicitud (CA 4)', async () => {
    mesasDisponibles();
    const { onOpenChange } = await abrir();
    await completarAlta();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormDialog: modificación (HU-M5-02)', () => {
  it('no muestra los campos de cliente ni de mesa', async () => {
    await abrir({ reserva: RESERVA });

    expect(screen.queryByLabelText(/Cliente/)).toBeNull();
    expect(screen.queryByLabelText(/Mesa/)).toBeNull();
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });

  it('precarga fecha, hora y comensales de la reserva', async () => {
    await abrir({ reserva: RESERVA });

    expect(screen.getByLabelText(/Fecha/)).toHaveValue(MANANA);
    expect(screen.getByLabelText(/Hora/)).toHaveValue('21:00');
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('4');
  });

  it('modifica fecha, hora y comensales y avisa', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({
      datos: { ...RESERVA, hora: '22:00:00', cantidad_personas: 6 },
      exito: true,
    });
    const { onGuardado } = await abrir({ reserva: RESERVA });

    fireEvent.change(screen.getByLabelText(/Hora/), { target: { value: '22:00' } });
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '6' } });
    guardar('Guardar cambios');

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarReserva).toHaveBeenCalledWith(1, {
      fecha: MANANA,
      hora: '22:00',
      cantidad_personas: 6,
    });
    expect(await screen.findByText('Reserva modificada')).toBeInTheDocument();
  });
});
