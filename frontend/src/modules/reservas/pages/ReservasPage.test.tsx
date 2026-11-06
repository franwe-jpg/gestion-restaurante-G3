import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import type { Pagina, RespuestaApi } from '../../../shared/types';
import {
  buscarClientes,
  cancelarReservaAnticipada,
  cancelarReservaPorAusencia,
  crearReserva,
  listarMesasDisponibles,
  listarReservas,
  modificarReserva,
} from '../api';
import type { ClienteEncontrado, MesaDisponible, Reserva } from '../types';

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

/** Otra fila `ACTIVA`, con cliente, mesa y cantidad distintos de `RESERVA`. */
const OTRA: Reserva = {
  ...RESERVA,
  id: 2,
  hora: '22:00',
  cliente_id: 9,
  mesa_id: 3,
  cantidad_personas: 2,
};

/** Mesa que ofrece la API simulada en el selector del panel de alta. */
const MESA_5: MesaDisponible = {
  id: 5,
  numero: 5,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón' },
};

/** Cliente que ofrece la búsqueda simulada del selector del modal de alta. */
const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };
const TEXTO_ANA = 'Ana Pérez · +54 280 1234567';

function clientes(items: ClienteEncontrado[]): RespuestaApi<Pagina<ClienteEncontrado>> {
  return { datos: { items, total: items.length, limit: 10, offset: 0 }, exito: true };
}

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

/**
 * `aceptado` por defecto `true`: las pruebas de alta y edición no usan confirmación y no deben
 * romperse por el nuevo `ConfirmContext.Provider` (Decisión 36 del diseño).
 */
function abrir(aceptado = true) {
  const confirmar = vi.fn().mockResolvedValue(aceptado);
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast: vi.fn() }}>
        <MemoryRouter initialEntries={['/reservas']}>
          <ReservasPage />
          <Ruta />
        </MemoryRouter>
      </ToastContext.Provider>
    </ConfirmContext.Provider>,
  );
  return confirmar;
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
/** Busca «Ana» en el selector del modal de alta y elige a «Ana Pérez» (cliente 7). */
async function elegirCliente() {
  fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Ana' } });
  fireEvent.click(await screen.findByRole('button', { name: TEXTO_ANA }));
}

async function completarDatosReserva() {
  fireEvent.change(screen.getByLabelText(/Fecha/), { target: { value: '2026-11-03' } });
  fireEvent.change(screen.getByLabelText(/Hora/), { target: { value: '22:15' } });
  fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '3' } });
  await screen.findByRole('option', { name: 'Salón · Mesa 5 (4 personas)' });
  fireEvent.change(screen.getByLabelText(/Mesa/), { target: { value: '5' } });
}

async function prepararAltaClienteNuevo() {
  abrir();
  await screen.findByText('Cliente n.º 7');
  await pulsar('Nueva reserva');
  await completarDatosReserva();
  await elegirCliente();
  expect(screen.getByText(`Cliente elegido: ${TEXTO_ANA}`)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Luis' } });
}

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
  vi.mocked(listarMesasDisponibles).mockResolvedValue({ datos: [MESA_5], exito: true });
  vi.mocked(buscarClientes).mockResolvedValue(clientes([ANA]));
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
  it('cerrar el modal descarta la elección: al reabrirlo el selector está vacío', async () => {
    await prepararAltaClienteNuevo();

    const dialogo = screen.getByRole('dialog');
    const tarjetaCliente = within(dialogo).getByRole('group', { name: 'Datos del cliente nuevo' });
    fireEvent.click(within(tarjetaCliente).getByRole('button', { name: 'Cancelar' }));

    expect(dialogo).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha/)).toHaveValue('2026-11-03');
    expect(screen.getByLabelText(/Hora/)).toHaveValue('22:15');
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('3');
    expect(screen.getByLabelText(/Mesa/)).toHaveValue('5');
    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
    expect(crearReserva).not.toHaveBeenCalled();

    await elegirCliente();
    expect(screen.getByText(`Cliente elegido: ${TEXTO_ANA}`)).toBeVisible();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await pulsar('Nueva reserva');

    expect(screen.queryByText(/Cliente elegido/)).toBeNull();
    expect(screen.queryByLabelText(/Nombre/)).toBeNull();
    expect(screen.queryByLabelText(/Teléfono/)).toBeNull();
    expect(screen.getByLabelText('Buscar cliente')).toHaveValue('');
  });

  it('guardar cierra el panel y vuelve a pedir la tabla', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');
    await pulsar('Nueva reserva');
    await elegirCliente();
    const campos = { Fecha: '2026-11-03', Hora: '21:30', Cantidad: '4' };
    for (const [etiqueta, valor] of Object.entries(campos)) {
      fireEvent.change(screen.getByLabelText(new RegExp(etiqueta)), { target: { value: valor } });
    }
    await screen.findByRole('option', { name: 'Salón · Mesa 5 (4 personas)' });
    fireEvent.change(screen.getByLabelText(/Mesa/), { target: { value: '5' } });

    await pulsar('Guardar reserva');

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nueva reserva' })).toBeNull(),
    );
    expect(listarMesasDisponibles).toHaveBeenCalledExactlyOnceWith('2026-11-03', '21:30');
    expect(crearReserva).toHaveBeenCalledExactlyOnceWith({
      mesa_id: 5,
      cliente_id: 7,
      fecha: '2026-11-03',
      hora: '21:30',
      cantidad_personas: 4,
    });
    expect(listarReservas).toHaveBeenCalledTimes(2);
    await asentar();
  });
});

/** Pulsa «Modificar reserva» en la fila que ocupa ese lugar de la tabla (la primera por defecto). */
async function modificar(fila = 0) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Modificar reserva' })[fila]!);
  await asentar();
}

describe('ReservasPage: abrir el panel de edición', () => {
  it('«Modificar reserva» abre el panel con los datos de la fila, sin pedir nada más', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');
    expect(screen.queryByRole('heading', { name: 'Modificar reserva' })).toBeNull();

    await modificar();

    expect(screen.getByRole('heading', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha/)).toHaveValue('2026-11-02');
    expect(screen.getByLabelText(/Hora/)).toHaveValue('21:30');
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('4');
    expect(screen.getByLabelText(/Cliente/)).toBeDisabled();
    expect(screen.getByLabelText(/Mesa/)).toBeDisabled();
    expect(screen.getByTestId('ruta')).toHaveTextContent('/reservas');
    expect(listarReservas).toHaveBeenCalledTimes(1);
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
    expect(crearReserva).not.toHaveBeenCalled();
    expect(modificarReserva).not.toHaveBeenCalled();
  });

  it('cerrar la edición de una fila con «Cancelar» y abrir la de otra trae los datos de la fila nueva', async () => {
    vi.mocked(listarReservas).mockResolvedValue(pagina([RESERVA, OTRA]));
    abrir();
    await screen.findByText('Cliente n.º 9');
    await modificar(0);
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('4');

    await pulsar('Cancelar');
    await modificar(1);

    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('2');
    expect(screen.getByLabelText(/Hora/)).toHaveValue('22:00');
    expect(screen.getByLabelText(/Cliente/)).toHaveValue('9');
    expect(screen.getByLabelText(/Mesa/)).toHaveValue('3');
  });

  it('«Nueva reserva» después de cerrar la edición con «Cancelar» abre el modal vacío', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();
    await pulsar('Cancelar');

    await pulsar('Nueva reserva');

    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Modificar reserva' })).toBeNull();
    for (const etiqueta of [/Cliente/, /Fecha/, /Hora/, /Cantidad de personas/]) {
      expect(screen.getByLabelText(etiqueta)).toHaveValue('');
      expect(screen.getByLabelText(etiqueta)).toBeEnabled();
    }
    // El selector de Mesa espera una Fecha y una Hora válidas: deshabilitado y sin opciones.
    expect(screen.getByLabelText(/Mesa/).tagName).toBe('SELECT');
    expect(screen.getByLabelText(/Mesa/)).toBeDisabled();
    expect(screen.queryAllByRole('option', { name: /Mesa/ })).toHaveLength(0);
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });
});

describe('ReservasPage: un solo modal a la vez (S36)', () => {
  it('el botón «Nueva reserva» se deshabilita durante la edición y pulsarlo no hace nada', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();

    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
    await asentar();

    expect(screen.getByRole('heading', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nueva reserva' })).toBeNull();
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('4');
  });

  it('«Nueva reserva» se habilita de nuevo al cerrar la edición con «Cancelar»', async () => {
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();
    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeDisabled();

    await pulsar('Cancelar');

    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeEnabled();
  });

  it('«Nueva reserva» se habilita de nuevo al guardar la edición', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();
    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeDisabled();

    await pulsar('Guardar reserva');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Modificar reserva' })).toBeNull(),
    );

    expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeEnabled();
  });
});

describe('ReservasPage: una respuesta de guardado tardía no toca un modal distinto (S38)', () => {
  it('un PUT tardío no cierra el alta abierta después', async () => {
    let resolverPut: (valor: RespuestaApi<Reserva>) => void = () => undefined;
    vi.mocked(modificarReserva).mockReturnValue(new Promise((resolve) => (resolverPut = resolve)));
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '6' } });
    await pulsar('Guardar reserva');

    await pulsar('Cancelar');
    await pulsar('Nueva reserva');
    fireEvent.change(screen.getByLabelText(/Cliente/), { target: { value: '9' } });
    await asentar();

    resolverPut({ datos: RESERVA, exito: true });
    await asentar();

    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cliente/)).toHaveValue('9');
    expect(listarReservas).toHaveBeenCalledTimes(1);
  });

  it('un POST tardío no cierra la edición abierta después', async () => {
    let resolverPost: (valor: RespuestaApi<Reserva>) => void = () => undefined;
    vi.mocked(crearReserva).mockReturnValue(new Promise((resolve) => (resolverPost = resolve)));
    vi.mocked(listarReservas).mockResolvedValue(pagina([RESERVA, OTRA]));
    abrir();
    await screen.findByText('Cliente n.º 9');
    await pulsar('Nueva reserva');
    await elegirCliente();
    const campos = { Fecha: '2026-11-03', Hora: '21:30', Cantidad: '4' };
    for (const [etiqueta, valor] of Object.entries(campos)) {
      fireEvent.change(screen.getByLabelText(new RegExp(etiqueta)), { target: { value: valor } });
    }
    await screen.findByRole('option', { name: 'Salón · Mesa 5 (4 personas)' });
    fireEvent.change(screen.getByLabelText(/Mesa/), { target: { value: '5' } });
    await pulsar('Guardar reserva');

    await pulsar('Cancelar');
    await modificar(1);
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '9' } });
    await asentar();

    resolverPost({ datos: RESERVA, exito: true });
    await asentar();

    expect(screen.getByRole('heading', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cantidad de personas/)).toHaveValue('9');
    expect(listarReservas).toHaveBeenCalledTimes(1);
  });
});

describe('ReservasPage: guardar la edición', () => {
  it('guardar envía el PUT, cierra el panel y vuelve a pedir la tabla', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: RESERVA, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');
    await modificar();
    fireEvent.change(screen.getByLabelText(/Cantidad de personas/), { target: { value: '6' } });

    await pulsar('Guardar reserva');

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Modificar reserva' })).toBeNull(),
    );
    expect(modificarReserva).toHaveBeenCalledExactlyOnceWith(1, {
      fecha: '2026-11-02',
      hora: '21:30',
      cantidad_personas: 6,
    });
    expect(listarReservas).toHaveBeenCalledTimes(2);
    await asentar();
  });
});

describe('ReservasPage: cancelar una reserva (HU-M5-04-05)', () => {
  it('confirmar «Cancelar reserva» llama a POST .../{id}/cancelar-anticipada y vuelve a pedir el listado', async () => {
    vi.mocked(cancelarReservaAnticipada).mockResolvedValue({ datos: null, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');

    await pulsar('Cancelar reserva');

    expect(cancelarReservaAnticipada).toHaveBeenCalledExactlyOnceWith(1);
    expect(listarReservas).toHaveBeenCalledTimes(2);
  });

  it('confirmar «Cancelar por ausencia» llama a POST .../{id}/cancelar-por-ausencia y vuelve a pedir el listado', async () => {
    vi.mocked(cancelarReservaPorAusencia).mockResolvedValue({ datos: null, exito: true });
    abrir();
    await screen.findByText('Cliente n.º 7');

    await pulsar('Cancelar por ausencia');

    expect(cancelarReservaPorAusencia).toHaveBeenCalledExactlyOnceWith(1);
    expect(listarReservas).toHaveBeenCalledTimes(2);
  });

  it('un 409 muestra el aviso y no vuelve a pedir el listado', async () => {
    vi.mocked(cancelarReservaAnticipada).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 1 ya fue cancelada',
    });
    abrir();
    await screen.findByText('Cliente n.º 7');

    await pulsar('Cancelar reserva');

    expect(listarReservas).toHaveBeenCalledTimes(1);
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
