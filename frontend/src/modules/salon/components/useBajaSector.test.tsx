import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { eliminarSector } from '../api';
import type { Sector } from '../types';

import { useBajaSector } from './useBajaSector';

vi.mock('../api');

const TERRAZA: Sector = {
  id: 2,
  nombre: 'Terraza',
  descripcion: 'Al aire libre',
  estado: 'HABILITADO',
};

const DESCRIPCION = 'El sector quedará deshabilitado y no se podrá elegir al crear mesas.';

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onEliminado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(() => useBajaSector({ onEliminado }), { wrapper: envoltorio });
  return { result, onEliminado };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaSector', () => {
  it('al confirmar da de baja, avisa y recarga (CA 1 de #35)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarSector).mockResolvedValue({
      datos: { ...TERRAZA, estado: 'DESHABILITADO' },
      exito: true,
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(TERRAZA));

    expect(confirmar).toHaveBeenCalledWith({
      titulo: '¿Eliminar el sector «Terraza»?',
      descripcion: DESCRIPCION,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      variante: 'danger',
    });
    expect(eliminarSector).toHaveBeenCalledWith(2);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Sector eliminado', variante: 'success' }),
    );
    expect(onEliminado).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(TERRAZA));

    expect(eliminarSector).not.toHaveBeenCalled();
    expect(onEliminado).not.toHaveBeenCalled();
  });

  it('si el sector tiene mesas muestra el mensaje del backend y no recarga (CA 2 de #35)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(eliminarSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se puede eliminar el sector Terraza porque tiene mesas asociadas',
    });
    const { result, onEliminado } = preparar();

    await act(() => result.current.eliminar(TERRAZA));

    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'No se pudo eliminar el sector',
      descripcion: 'No se puede eliminar el sector Terraza porque tiene mesas asociadas',
      variante: 'danger',
    });
    expect(onEliminado).not.toHaveBeenCalled();
  });
});
