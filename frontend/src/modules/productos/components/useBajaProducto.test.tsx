import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaProducto } from '../api';
import type { ProductoSalida } from '../types';

import { useBajaProducto } from './useBajaProducto';

vi.mock('../api');

const PLATO: ProductoSalida = {
  id: 7,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  ingredientes: ['Pan'],
  descripcion: null,
  etiquetas: [],
  estado: 'HABILITADO',
  seccion: { id: 3, nombre: 'Platos' },
  imagen_url: null,
};

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function preparar() {
  const onDadoDeBaja = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
    </ConfirmContext.Provider>
  );
  const { result } = renderHook(
    () => useBajaProducto({ categoria: 'PLATO', producto: PLATO, onDadoDeBaja }),
    { wrapper: envoltorio },
  );
  return { result, onDadoDeBaja };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useBajaProducto', () => {
  it('al confirmar da de baja, avisa y notifica', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...PLATO, estado: 'DESHABILITADO' },
      exito: true,
    });
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: '¿Dar de baja «Milanesa»?',
        textoConfirmar: 'Dar de baja',
        textoCancelar: 'Cancelar',
        variante: 'danger',
      }),
    );
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato dado de baja', variante: 'success' }),
    );
    expect(onDadoDeBaja).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(darDeBajaProducto).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });

  it('si el servidor falla avisa el error y no notifica', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El producto ya está deshabilitado',
    });
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'No se pudo dar de baja el plato',
        descripcion: 'El producto ya está deshabilitado',
        variante: 'danger',
      }),
    );
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });
});
