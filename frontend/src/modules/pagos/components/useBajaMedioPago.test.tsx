import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { eliminarMedioPago } from '../api';
import type { MedioPago } from '../types';

import { useBajaMedioPago } from './useBajaMedioPago';

vi.mock('../api');

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onEliminado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(() => useBajaMedioPago({ onEliminado }), {
    wrapper: envoltorio,
  });
  return { result, onEliminado };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaMedioPago (HU-M6-06)', () => {
  it('al confirmar elimina, avisa y recarga (CA 1)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMedioPago).mockResolvedValue({ datos: null, exito: true });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(EFECTIVO));

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: '¿Eliminar el medio de pago «Efectivo»?' }),
    );
    expect(eliminarMedioPago).toHaveBeenCalledWith(1);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Medio de pago eliminado' }),
    );
    expect(onEliminado).toHaveBeenCalled();
  });

  it('al cancelar no llama a la API (CA 2)', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(EFECTIVO));

    expect(eliminarMedioPago).not.toHaveBeenCalled();
    expect(onEliminado).not.toHaveBeenCalled();
  });

  it('informa el error del servidor si ya no existe (CA 4)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMedioPago).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El medio de pago 1 no existe',
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(EFECTIVO));

    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: 'El medio de pago 1 no existe', variante: 'danger' }),
    );
    expect(onEliminado).not.toHaveBeenCalled();
  });
});
