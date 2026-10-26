import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaProducto } from '../api';
import type { ProductoListado } from '../types';

import { AccionesProducto } from './AccionesProducto';

vi.mock('../api');

const PLATO: ProductoListado = {
  id: 7,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  seccion: { id: 3, nombre: 'Platos' },
  precio: '12500.50',
  etiquetas: [],
  estado: 'HABILITADO',
};

const mostrarToast = vi.fn();
const confirmar = vi.fn();

function mostrar(producto: ProductoListado) {
  const onDadoDeBaja = vi.fn();
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast }}>
        <MemoryRouter>
          <Routes>
            <Route
              path="/"
              element={<AccionesProducto producto={producto} onDadoDeBaja={onDadoDeBaja} />}
            />
            <Route path="/productos/platos/:id/editar" element={<p>Pantalla de edición</p>} />
          </Routes>
        </MemoryRouter>
      </ToastContext.Provider>
    </ConfirmContext.Provider>,
  );
  return onDadoDeBaja;
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('AccionesProducto', () => {
  it('ofrece editar un plato con un enlace a su pantalla de edición (S27)', () => {
    mostrar(PLATO);

    const enlace = screen.getByRole('link', { name: 'Editar «Milanesa»' });
    expect(enlace).toHaveAttribute('href', '/productos/platos/7/editar');
    fireEvent.click(enlace);
    expect(screen.getByText('Pantalla de edición')).toBeInTheDocument();
  });

  it('al confirmar da de baja el plato, avisa y notifica (S28)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: {
        ...PLATO,
        ingredientes: ['Pan'],
        descripcion: null,
        estado: 'DESHABILITADO',
        imagen_url: null,
      },
      exito: true,
    });
    const onDadoDeBaja = mostrar(PLATO);

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja «Milanesa»' }));

    await vi.waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato dado de baja', variante: 'success' }),
    );
  });

  it('al cancelar no envía nada ni notifica', async () => {
    confirmar.mockResolvedValue(false);
    const onDadoDeBaja = mostrar(PLATO);

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja «Milanesa»' }));

    await vi.waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });

  it('un plato deshabilitado ofrece editar y no dar de baja', () => {
    mostrar({ ...PLATO, estado: 'DESHABILITADO' });

    expect(screen.getByRole('link', { name: 'Editar «Milanesa»' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dar de baja/ })).not.toBeInTheDocument();
  });

  it.each(['POSTRE', 'BEBIDA'] as const)('una fila %s no ofrece acciones', (categoria) => {
    mostrar({ ...PLATO, categoria });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
