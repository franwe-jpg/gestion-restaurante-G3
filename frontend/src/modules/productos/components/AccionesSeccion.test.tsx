import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaSeccion } from '../api';
import type { SeccionListado } from '../types';

import { AccionesSeccion } from './AccionesSeccion';

vi.mock('../api');

const ENTRADAS: SeccionListado = {
  id: 1,
  nombre: 'Entradas',
  orden: 1,
  estado: 'HABILITADO',
  cantidad_productos: 2,
  productos_habilitados: 2,
};

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function mostrar(seccion: SeccionListado) {
  const onEditar = vi.fn();
  const onDadoDeBaja = vi.fn();
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>
        <AccionesSeccion seccion={seccion} onEditar={onEditar} onDadoDeBaja={onDadoDeBaja} />
      </ToastContext.Provider>
    </ConfirmContext.Provider>,
  );
  return { onEditar, onDadoDeBaja };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('AccionesSeccion', () => {
  it('«Editar» avisa con la fila de la sección', () => {
    const { onEditar } = mostrar(ENTRADAS);

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Entradas»' }));

    expect(onEditar).toHaveBeenCalledWith(ENTRADAS);
  });

  it('habilitada ofrece dar de baja y, al confirmar, notifica (CA 1)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaSeccion).mockResolvedValue({
      datos: {
        id: 1,
        nombre: 'Entradas',
        orden: 1,
        estado: 'DESHABILITADO',
        productos: [],
        productos_habilitados: 0,
      },
      exito: true,
    });
    const { onDadoDeBaja } = mostrar(ENTRADAS);

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja «Entradas»' }));

    await vi.waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaSeccion).toHaveBeenCalledWith(1);
  });

  it('deshabilitada ofrece editar y no dar de baja (S73)', () => {
    mostrar({ ...ENTRADAS, estado: 'DESHABILITADO' });

    expect(screen.getByRole('button', { name: 'Editar «Entradas»' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dar de baja/ })).not.toBeInTheDocument();
  });
});
