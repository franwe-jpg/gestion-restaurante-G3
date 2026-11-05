import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { eliminarMozo } from '../api';
import type { Mozo } from '../types';

import { useBajaMozo } from './useBajaMozo';

vi.mock('../api');

const MOZO: Mozo = {
  id: 3,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: null,
  estado: 'HABILITADO',
};

const DESCRIPCION = 'El mozo quedará deshabilitado y no se podrá asignar a nuevas mesas.';

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onEliminado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(() => useBajaMozo({ onEliminado }), { wrapper: envoltorio });
  return { result, onEliminado };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaMozo', () => {
  it('al confirmar da de baja, avisa y recarga (CA 1 de #45)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMozo).mockResolvedValue({
      datos: { ...MOZO, estado: 'DESHABILITADO' },
      exito: true,
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(MOZO));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Dar de baja a Fernández, Juan?',
      descripcion: DESCRIPCION,
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    expect(eliminarMozo).toHaveBeenCalledWith(3);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Mozo dado de baja', variante: 'success' }),
    );
    expect(onEliminado).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada (CA 2 de #45)', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(MOZO));

    expect(eliminarMozo).not.toHaveBeenCalled();
    expect(onEliminado).not.toHaveBeenCalled();
  });

  it('si el mozo ya está dado de baja muestra el mensaje y no recarga (CA 4 de #45)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarMozo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El mozo ya está dado de baja',
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(MOZO));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo dar de baja al mozo',
      descripcion: 'El mozo ya está dado de baja',
      variante: 'danger',
    });
    expect(onEliminado).not.toHaveBeenCalled();
  });
});
