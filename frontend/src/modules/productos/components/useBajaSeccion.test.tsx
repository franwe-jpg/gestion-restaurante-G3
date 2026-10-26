import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaSeccion } from '../api';
import type { Seccion } from '../types';

import { descripcionDeLaBaja, useBajaSeccion } from './useBajaSeccion';

vi.mock('../api');

const SECCION = { id: 3, nombre: 'Postres', productos_habilitados: 3 };

const DADA_DE_BAJA: Seccion = {
  id: 3,
  nombre: 'Postres',
  orden: 1,
  estado: 'DESHABILITADO',
  productos: [],
  productos_habilitados: 0,
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
  const { result } = renderHook(() => useBajaSeccion({ seccion: SECCION, onDadoDeBaja }), {
    wrapper: envoltorio,
  });
  return { result, onDadoDeBaja };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('descripcionDeLaBaja', () => {
  it.each([
    [0, 'La sección no tiene productos habilitados.'],
    [1, '1 producto habilitado dejará de mostrarse en la carta.'],
    [3, '3 productos habilitados dejarán de mostrarse en la carta.'],
  ])('con %i productos habilitados avisa el efecto en la carta (CA 2)', (cantidad, aviso) => {
    expect(descripcionDeLaBaja(cantidad)).toBe(
      `${aviso} La sección quedará deshabilitada; puede volver a habilitarla al editarla.`,
    );
  });
});

describe('useBajaSeccion', () => {
  it('al confirmar da de baja, avisa y notifica (CA 1)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaSeccion).mockResolvedValue({ datos: DADA_DE_BAJA, exito: true });
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: '¿Dar de baja «Postres»?',
        descripcion: descripcionDeLaBaja(3),
        textoConfirmar: 'Dar de baja',
        textoCancelar: 'Cancelar',
        variante: 'danger',
      }),
    );
    expect(darDeBajaSeccion).toHaveBeenCalledWith(3);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Sección dada de baja', variante: 'success' }),
    );
    expect(onDadoDeBaja).toHaveBeenCalledTimes(1);
  });

  it('al cancelar no envía nada (CA 4)', async () => {
    confirmar.mockResolvedValue(false);
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(darDeBajaSeccion).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });

  it('si el servidor falla avisa el error y no notifica', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaSeccion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'La sección ya está deshabilitada',
    });
    const { result, onDadoDeBaja } = preparar();

    await act(() => result.current.darDeBaja());

    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'No se pudo dar de baja la sección',
        descripcion: 'La sección ya está deshabilitada',
        variante: 'danger',
      }),
    );
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });
});
