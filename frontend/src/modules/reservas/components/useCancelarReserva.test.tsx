import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { cancelarReservaAnticipada, cancelarReservaPorAusencia } from '../api';

import { useCancelarReserva } from './useCancelarReserva';

vi.mock('../api');

const RESERVA = { id: 1 };

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onCancelada = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(() => useCancelarReserva({ onCancelada }), {
    wrapper: envoltorio,
  });
  return { result, onCancelada };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useCancelarReserva: cancelación anticipada', () => {
  it('al confirmar llama a la API, avisa el éxito y recarga', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(cancelarReservaAnticipada).mockResolvedValue({ datos: null, exito: true });
    const { result, onCancelada } = preparar();

    await act(() => result.current.cancelarAnticipada(RESERVA));

    expect(cancelarReservaAnticipada).toHaveBeenCalledWith(1);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva cancelada', variante: 'success' }),
    );
    expect(onCancelada).toHaveBeenCalledTimes(1);
  });

  it('pide confirmación con los textos exactos de S52', async () => {
    confirmar.mockResolvedValue(false);
    const { result } = preparar();

    await act(() => result.current.cancelarAnticipada(RESERVA));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Cancelar la reserva?',
      descripcion: 'La mesa quedará disponible para ese turno.',
      textoConfirmar: 'Cancelar',
      textoCancelar: 'Volver',
      variante: 'danger',
    });
  });

  it('un 409 muestra el aviso con el detalle y no llama a onCancelada', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(cancelarReservaAnticipada).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 1 ya fue cancelada',
    });
    const { result, onCancelada } = preparar();

    await act(() => result.current.cancelarAnticipada(RESERVA));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo cancelar la reserva',
      descripcion: 'La reserva 1 ya fue cancelada',
      variante: 'danger',
    });
    expect(onCancelada).not.toHaveBeenCalled();
  });
});

describe('useCancelarReserva: cancelación por ausencia', () => {
  it('al confirmar llama a la API, avisa el éxito y recarga', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(cancelarReservaPorAusencia).mockResolvedValue({ datos: null, exito: true });
    const { result, onCancelada } = preparar();

    await act(() => result.current.cancelarPorAusencia(RESERVA));

    expect(cancelarReservaPorAusencia).toHaveBeenCalledWith(1);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva cancelada por ausencia', variante: 'success' }),
    );
    expect(onCancelada).toHaveBeenCalledTimes(1);
  });

  it('pide confirmación con los textos exactos de S52', async () => {
    confirmar.mockResolvedValue(false);
    const { result } = preparar();

    await act(() => result.current.cancelarPorAusencia(RESERVA));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Cancelar por ausencia?',
      descripcion:
        'La mesa quedará disponible para ese turno y se registra que el cliente no vino.',
      textoConfirmar: 'Cancelar',
      textoCancelar: 'Volver',
      variante: 'danger',
    });
  });

  it('un 409 muestra el aviso con el detalle y no llama a onCancelada', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(cancelarReservaPorAusencia).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La reserva 1 todavía no llegó a su hora y no se puede cancelar por ausencia',
    });
    const { result, onCancelada } = preparar();

    await act(() => result.current.cancelarPorAusencia(RESERVA));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo cancelar la reserva',
      descripcion: 'La reserva 1 todavía no llegó a su hora y no se puede cancelar por ausencia',
      variante: 'danger',
    });
    expect(onCancelada).not.toHaveBeenCalled();
  });
});

describe('useCancelarReserva: cancelar el diálogo de confirmación', () => {
  it('no llama a ninguna API ni a onCancelada, para ninguna de las dos acciones', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onCancelada } = preparar();

    await act(() => result.current.cancelarAnticipada(RESERVA));
    await act(() => result.current.cancelarPorAusencia(RESERVA));

    expect(cancelarReservaAnticipada).not.toHaveBeenCalled();
    expect(cancelarReservaPorAusencia).not.toHaveBeenCalled();
    expect(onCancelada).not.toHaveBeenCalled();
  });
});
