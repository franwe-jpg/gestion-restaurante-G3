import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { eliminarChef } from '../api';
import type { Chef } from '../types';

import { useBajaChef } from './useBajaChef';

vi.mock('../api');

const CHEF: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
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
  const { result } = renderHook(() => useBajaChef({ onEliminado }), { wrapper: envoltorio });
  return { result, onEliminado };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaChef', () => {
  it('al confirmar da de baja al chef, avisa y recarga', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarChef).mockResolvedValue({
      datos: { ...CHEF, estado: 'DESHABILITADO' },
      exito: true,
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(CHEF));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Dar de baja a Gómez, Marta?',
      descripcion: 'El chef quedará deshabilitado y no podrá iniciar sesión.',
      textoConfirmar: 'Dar de baja',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    expect(eliminarChef).toHaveBeenCalledWith(4);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Chef dado de baja', variante: 'success' }),
    );
    expect(onEliminado).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(CHEF));

    expect(eliminarChef).not.toHaveBeenCalled();
    expect(onEliminado).not.toHaveBeenCalled();
  });

  it('si el chef ya está dado de baja muestra el mensaje y no recarga', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarChef).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El chef ya está dado de baja',
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(CHEF));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo dar de baja al chef',
      descripcion: 'El chef ya está dado de baja',
      variante: 'danger',
    });
    expect(onEliminado).not.toHaveBeenCalled();
  });
});
