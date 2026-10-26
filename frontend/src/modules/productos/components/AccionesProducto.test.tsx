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
            <Route path="/productos/:segmento/:id/editar" element={<p>Pantalla de edición</p>} />
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

const POSTRE: ProductoListado = { ...PLATO, id: 9, nombre: 'Flan', categoria: 'POSTRE' };

describe.each([
  ['PLATO', PLATO, 'platos', 'Plato dado de baja'],
  ['POSTRE', POSTRE, 'postres', 'Postre dado de baja'],
] as const)('AccionesProducto: %s', (categoria, producto, segmento, aviso) => {
  it('ofrece editar con un enlace a su pantalla de edición (S27, S31)', () => {
    mostrar(producto);

    const enlace = screen.getByRole('link', { name: `Editar «${producto.nombre}»` });
    expect(enlace).toHaveAttribute('href', `/productos/${segmento}/${producto.id}/editar`);
    fireEvent.click(enlace);
    expect(screen.getByText('Pantalla de edición')).toBeInTheDocument();
  });

  it('al confirmar da de baja, avisa y notifica (S28)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: {
        ...producto,
        ingredientes: ['Pan'],
        descripcion: null,
        estado: 'DESHABILITADO',
        imagen_url: null,
      },
      exito: true,
    });
    const onDadoDeBaja = mostrar(producto);

    fireEvent.click(screen.getByRole('button', { name: `Dar de baja «${producto.nombre}»` }));

    await vi.waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).toHaveBeenCalledWith(categoria, producto.id);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: aviso, variante: 'success' }),
    );
  });

  it('al cancelar no envía nada ni notifica', async () => {
    confirmar.mockResolvedValue(false);
    const onDadoDeBaja = mostrar(producto);

    fireEvent.click(screen.getByRole('button', { name: `Dar de baja «${producto.nombre}»` }));

    await vi.waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
  });

  it('deshabilitado ofrece editar y no dar de baja', () => {
    mostrar({ ...producto, estado: 'DESHABILITADO' });

    expect(screen.getByRole('link', { name: `Editar «${producto.nombre}»` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dar de baja/ })).not.toBeInTheDocument();
  });
});

describe('AccionesProducto: otras categorías', () => {
  it('una fila MENU_DEL_DIA no ofrece acciones (S57)', () => {
    mostrar({ ...PLATO, categoria: 'MENU_DEL_DIA' });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
