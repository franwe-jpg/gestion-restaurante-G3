import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaMenuEjecutivo } from '../api';

import { useBajaMenuEjecutivo } from './useBajaMenuEjecutivo';

vi.mock('../api');

const MENU = { id: 1, nombre: 'Almuerzo ejecutivo' };
const mostrarToast = vi.fn();

function envoltorioCon(respuesta: boolean) {
  return ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={() => Promise.resolve(respuesta)}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

function preparar(respuesta: boolean) {
  const onDadoDeBaja = vi.fn();
  const { result } = renderHook(() => useBajaMenuEjecutivo({ menu: MENU, onDadoDeBaja }), {
    wrapper: envoltorioCon(respuesta),
  });
  return { result, onDadoDeBaja };
}

afterEach(() => vi.resetAllMocks());

describe('useBajaMenuEjecutivo', () => {
  it('no llama a la API si se cancela la confirmación', async () => {
    const { result, onDadoDeBaja } = preparar(false);

    await act(() => result.current.darDeBaja());

    expect(darDeBajaMenuEjecutivo).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });

  it('da de baja, avisa y recarga el listado al confirmar', async () => {
    vi.mocked(darDeBajaMenuEjecutivo).mockResolvedValue({ datos: null, exito: true });
    const { result, onDadoDeBaja } = preparar(true);

    await act(() => result.current.darDeBaja());

    expect(darDeBajaMenuEjecutivo).toHaveBeenCalledWith(1);
    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'Menú ejecutivo dado de baja',
      variante: 'success',
    });
    expect(onDadoDeBaja).toHaveBeenCalledOnce();
  });
});
