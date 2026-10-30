import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { eliminarMesa } from '../api';
import type { Mesa } from '../types';

import { useBajaMesa } from './useBajaMesa';

vi.mock('../api');

const MESA: Mesa = {
  id: 3,
  numero: 3,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

const DESCRIPCION = 'La mesa se quitará del salón y no se podrá volver a usar.';

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onEliminada = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(() => useBajaMesa({ onEliminada }), { wrapper: envoltorio });
  return { result, onEliminada };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaMesa', () => {
  it('al confirmar elimina, avisa y recarga (CA 1 de #37)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMesa).mockResolvedValue({ datos: null, exito: true });
    const { result, onEliminada } = preparar();

    await act(() => result.current.eliminar(MESA));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Eliminar la mesa 3?',
      descripcion: DESCRIPCION,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    expect(eliminarMesa).toHaveBeenCalledWith(3);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Mesa eliminada', variante: 'success' }),
    );
    expect(onEliminada).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada (CA 2 de #37)', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onEliminada } = preparar();

    await act(() => result.current.eliminar(MESA));

    expect(eliminarMesa).not.toHaveBeenCalled();
    expect(onEliminada).not.toHaveBeenCalled();
  });

  it('si la mesa está ocupada muestra el mensaje del backend y no recarga (CA 3 de #37)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMesa).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se puede eliminar la mesa 3 porque está ocupada',
    });
    const { result, onEliminada } = preparar();

    await act(() => result.current.eliminar(MESA));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo eliminar la mesa',
      descripcion: 'No se puede eliminar la mesa 3 porque está ocupada',
      variante: 'danger',
    });
    expect(onEliminada).not.toHaveBeenCalled();
  });
});
