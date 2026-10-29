import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearReserva, listarReservas } from '../api';
import type { Reserva } from '../types';

import { ReservasPage } from './ReservasPage';

vi.mock('../api');

const RESERVA: Reserva = {
  id: 1,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-02',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

function pagina(items: Reserva[], total = items.length, offset = 0) {
  return { datos: { items, total, limit: 50, offset }, exito: true };
}

/** 60 reservas en dos páginas de 50 y 10; el cliente de cada una es su número. */
function servirSesentaReservas() {
  vi.mocked(listarReservas).mockImplementation((_fecha, _estado, limit, offset) => {
    const cantidad = Math.min(limit, 60 - offset);
    const items = Array.from({ length: cantidad }, (_, i) => ({
      ...RESERVA,
      id: offset + i + 1,
      cliente_id: offset + i + 1,
    }));
    return Promise.resolve(pagina(items, 60, offset));
  });
}

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>;
}

function abrir() {
  render(
    <ToastContext.Provider value={{ mostrarToast: vi.fn() }}>
      <MemoryRouter initialEntries={['/reservas']}>
        <ReservasPage />
        <Ruta />
      </MemoryRouter>
    </ToastContext.Provider>,
  );
}

/** Deja que terminen las respuestas simuladas pendientes antes de seguir. */
async function asentar() {
  await act(async () => undefined);
}

async function pulsar(nombre: string) {
  fireEvent.click(screen.getByRole('button', { name: nombre }));
  await asentar();
}

async function elegirDia(dia: string) {
  fireEvent.change(screen.getByLabelText('Día'), { target: { value: dia } });
  await asentar();
}

/** Abre la pantalla con 60 reservas y pasa a la segunda página (`offset` 50). */
async function abrirEnLaSegundaPagina() {
  servirSesentaReservas();
  abrir();
  await screen.findByText('Cliente n.º 1');
  await pulsar('Página siguiente');
  await screen.findByText('Cliente n.º 51');
}

beforeEach(() => {
  // Solo el reloj: los temporizadores reales siguen sirviendo a waitFor y findBy.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 12, 0));
  vi.mocked(listarReservas).mockResolvedValue(pagina([RESERVA]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('ReservasPage: apertura', () => {
  it('pide las reservas activas de hoy y las muestra con el día y el estado elegidos', async () => {
    abrir();

    expect(await screen.findByText('Cliente n.º 7')).toBeInTheDocument();
    expect(listarReservas).toHaveBeenCalledExactlyOnceWith('2026-11-02', 'ACTIVA', 50, 0);
    expect(screen.getByLabelText('Día')).toHaveValue('2026-11-02');
    expect(screen.getByRole('option', { name: 'Activa', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Reservas del 02/11/2026')).toBeInTheDocument();
  });

  it('arranca con el panel cerrado y «Nueva reserva» lo abre sin cambiar de ruta', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');
    expect(screen.queryByRole('heading', { name: 'Nueva reserva' })).toBeNull();

    await pulsar('Nueva reserva');

    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(screen.getByTestId('ruta')).toHaveTextContent('/reservas');
  });

  it('con una sola página no muestra la paginación', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');

    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });
});

describe('ReservasPage: navegador de fecha', () => {
  it('«Día siguiente» y «Día anterior» piden el día vecino y lo muestran', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');

    await pulsar('Día siguiente');
    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-03', 'ACTIVA', 50, 0);
    expect(screen.getByLabelText('Día')).toHaveValue('2026-11-03');
    expect(screen.getByText('Reservas del 03/11/2026')).toBeInTheDocument();

    await pulsar('Día anterior');
    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-02', 'ACTIVA', 50, 0);
  });

  it('elegir un día en el campo lo pide y «Hoy» vuelve al día de hoy', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');

    await elegirDia('2026-11-10');
    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-10', 'ACTIVA', 50, 0);

    await pulsar('Hoy');
    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-02', 'ACTIVA', 50, 0);
  });

  it('cambiar de día desde la segunda página vuelve a la primera', async () => {
    await abrirEnLaSegundaPagina();
    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-02', 'ACTIVA', 50, 50);

    await pulsar('Día siguiente');

    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-03', 'ACTIVA', 50, 0);
    expect(listarReservas).not.toHaveBeenCalledWith('2026-11-03', 'ACTIVA', 50, 50);
  });
});

describe('ReservasPage: filtro de estado y paginación', () => {
  it('el selector ofrece los cuatro estados y «Todas»', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');

    const opciones = screen.getAllByRole('option').map((opcion) => opcion.textContent);

    expect(opciones).toEqual([
      'Activa',
      'Atendida',
      'Cancelada anticipada',
      'Cancelada por ausencia',
      'Todas',
    ]);
  });

  it.each(['TODAS', 'ATENDIDA'])(
    'elegir %s desde la segunda página pide el día de hoy con esa opción y offset 0',
    async (estado) => {
      await abrirEnLaSegundaPagina();

      fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: estado } });
      await asentar();

      expect(listarReservas).toHaveBeenLastCalledWith('2026-11-02', estado, 50, 0);
    },
  );

  it('con 60 reservas pasa a la página siguiente con offset 50 y muestra las 10 restantes', async () => {
    servirSesentaReservas();
    abrir();
    await screen.findByText('Cliente n.º 1');
    expect(screen.getAllByRole('row')).toHaveLength(51);

    await pulsar('Página siguiente');

    expect(listarReservas).toHaveBeenLastCalledWith('2026-11-02', 'ACTIVA', 50, 50);
    expect(await screen.findByText('Cliente n.º 60')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });
});

describe('ReservasPage: panel de alta', () => {
  it('guardar cierra el panel y vuelve a pedir la tabla', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');
    await pulsar('Nueva reserva');
    const campos = { Cliente: '7', Fecha: '2026-11-03', Hora: '21:30', Cantidad: '4', Mesa: '5' };
    for (const [etiqueta, valor] of Object.entries(campos)) {
      fireEvent.change(screen.getByLabelText(new RegExp(etiqueta)), { target: { value: valor } });
    }

    await pulsar('Guardar reserva');

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nueva reserva' })).toBeNull(),
    );
    expect(crearReserva).toHaveBeenCalledTimes(1);
    expect(listarReservas).toHaveBeenCalledTimes(2);
    await asentar();
  });
});

describe('ReservasPage: estados vacío y de error', () => {
  it('sin resultados muestra el mensaje de filtros sin coincidencias', async () => {
    vi.mocked(listarReservas).mockResolvedValue(pagina([]));

    abrir();

    expect(await screen.findByText('No hay reservas para los filtros elegidos.')).toBeVisible();
  });

  it('ante un error de carga ofrece reintentar la misma consulta', async () => {
    vi.mocked(listarReservas).mockResolvedValueOnce({ datos: null, exito: false, error: 'Falló' });
    abrir();
    expect(await screen.findByText('No se pudieron cargar las reservas.')).toBeVisible();

    await pulsar('Reintentar');

    expect(listarReservas).toHaveBeenCalledTimes(2);
    expect(listarReservas).toHaveBeenNthCalledWith(2, '2026-11-02', 'ACTIVA', 50, 0);
    expect(await screen.findByText('Cliente n.º 7')).toBeInTheDocument();
  });
});
