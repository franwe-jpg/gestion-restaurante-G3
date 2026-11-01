import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RespuestaApi } from '../../../shared/types';
import { listarMesasDisponibles } from '../api';
import type { MesaDisponible } from '../types';

import { useMesasDisponibles } from './useMesasDisponibles';

vi.mock('../api');

type Respuesta = RespuestaApi<MesaDisponible[]>;

const MESA_5: MesaDisponible = {
  id: 5,
  numero: 5,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón' },
};
const MESA_12: MesaDisponible = {
  id: 12,
  numero: 1,
  capacidad: 2,
  sector: { id: 2, nombre: 'Terraza' },
};

const TURNO = { fecha: '2026-11-02', hora: '21:30', habilitado: true };

function conMesas(mesas: MesaDisponible[]): Respuesta {
  return { datos: mesas, exito: true };
}

/** Un pedido que el test resuelve a mano, para controlar el orden en que llegan las respuestas. */
function pedidoPendiente() {
  let resolver: (respuesta: Respuesta) => void = () => undefined;
  const promesa = new Promise<Respuesta>((resolve) => (resolver = resolve));
  return {
    promesa,
    responder: (respuesta: Respuesta) => act(async () => resolver(respuesta)),
  };
}

function montar(inicial = TURNO) {
  return renderHook(({ fecha, hora, habilitado }) => useMesasDisponibles(fecha, hora, habilitado), {
    initialProps: inicial,
  });
}

/** Deja que terminen las respuestas simuladas pendientes antes de comprobar nada. */
async function asentar() {
  await act(async () => undefined);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useMesasDisponibles: sin turno válido', () => {
  it('sin un turno válido no pide la lista y queda inactivo', async () => {
    const { result } = montar({ ...TURNO, habilitado: false });
    await asentar();

    expect(result.current).toEqual({ tipo: 'inactivo' });
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });

  it('si el turno deja de ser válido vuelve a inactivo y no pide', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([MESA_5]));
    const { result, rerender } = montar();
    await waitFor(() => expect(result.current.tipo).toBe('listo'));

    rerender({ ...TURNO, habilitado: false });
    await asentar();

    expect(result.current).toEqual({ tipo: 'inactivo' });
    expect(listarMesasDisponibles).toHaveBeenCalledTimes(1);
  });
});

describe('useMesasDisponibles: con turno válido', () => {
  it('con un turno válido pasa por cargando y llega a listo con las mesas', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([MESA_5, MESA_12]));

    const { result } = montar();

    expect(result.current).toEqual({ tipo: 'cargando' });
    await waitFor(() =>
      expect(result.current).toEqual({ tipo: 'listo', mesas: [MESA_5, MESA_12] }),
    );
    expect(listarMesasDisponibles).toHaveBeenCalledExactlyOnceWith('2026-11-02', '21:30');
  });

  it('si la lista llega vacía queda listo con una lista vacía', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([]));

    const { result } = montar();

    await waitFor(() => expect(result.current).toEqual({ tipo: 'listo', mesas: [] }));
  });

  it('si la consulta falla queda en error con el mensaje de la API', async () => {
    const mensaje = 'La hora de la reserva debe ser posterior a la hora actual';
    vi.mocked(listarMesasDisponibles).mockResolvedValue({
      datos: null,
      exito: false,
      error: mensaje,
    });

    const { result } = montar();

    await waitFor(() => expect(result.current).toEqual({ tipo: 'error', mensaje }));
  });

  it('si la consulta falla sin detalle queda en error con un mensaje propio', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue({ datos: null, exito: false });

    const { result } = montar();

    await waitFor(() =>
      expect(result.current).toEqual({
        tipo: 'error',
        mensaje: 'No se pudieron cargar las mesas disponibles.',
      }),
    );
  });

  it('una respuesta exitosa sin datos queda como lista vacía', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue({ datos: null, exito: true });

    const { result } = montar();

    await waitFor(() => expect(result.current).toEqual({ tipo: 'listo', mesas: [] }));
  });
});

describe('useMesasDisponibles: cambio de turno', () => {
  it('al cambiar la hora vuelve a pedir y, mientras llega la respuesta nueva, está cargando y no muestra la lista del turno anterior', async () => {
    const nuevo = pedidoPendiente();
    vi.mocked(listarMesasDisponibles)
      .mockResolvedValueOnce(conMesas([MESA_5]))
      .mockReturnValueOnce(nuevo.promesa);
    const { result, rerender } = montar();
    await waitFor(() => expect(result.current).toEqual({ tipo: 'listo', mesas: [MESA_5] }));

    rerender({ ...TURNO, hora: '22:00' });

    expect(result.current).toEqual({ tipo: 'cargando' });
    expect(listarMesasDisponibles).toHaveBeenLastCalledWith('2026-11-02', '22:00');
    await nuevo.responder(conMesas([MESA_12]));
    expect(result.current).toEqual({ tipo: 'listo', mesas: [MESA_12] });
  });

  it('una respuesta vieja que llega después de la nueva se descarta', async () => {
    const viejo = pedidoPendiente();
    const nuevo = pedidoPendiente();
    vi.mocked(listarMesasDisponibles)
      .mockReturnValueOnce(viejo.promesa)
      .mockReturnValueOnce(nuevo.promesa);
    const { result, rerender } = montar();
    rerender({ ...TURNO, hora: '22:00' });

    await nuevo.responder(conMesas([MESA_12]));
    await viejo.responder(conMesas([MESA_5]));

    expect(result.current).toEqual({ tipo: 'listo', mesas: [MESA_12] });
  });

  it('una respuesta que llega después de que el turno dejó de ser válido se descarta', async () => {
    const vieja = pedidoPendiente();
    const reintento = pedidoPendiente();
    vi.mocked(listarMesasDisponibles)
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(reintento.promesa);
    const { result, rerender } = montar();
    rerender({ ...TURNO, habilitado: false });

    await vieja.responder(conMesas([MESA_5]));
    expect(result.current).toEqual({ tipo: 'inactivo' });

    // Mismo turno otra vez: la respuesta descartada no puede reaparecer como si fuera la nueva.
    rerender(TURNO);
    expect(result.current).toEqual({ tipo: 'cargando' });
    await reintento.responder(conMesas([MESA_12]));
    expect(result.current).toEqual({ tipo: 'listo', mesas: [MESA_12] });
  });
});
