import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import { darDeBajaProducto, listarProductos } from '../api';
import type { ProductoListado } from '../types';

import { ProductosTab } from './ProductosTab';

vi.mock('../api');

const MILANESA: ProductoListado = {
  id: 7,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  seccion: { id: 3, nombre: 'Platos' },
  precio: '12500.50',
  etiquetas: [],
  estado: 'HABILITADO',
};

const confirmar = vi.fn();

function pagina(items: ProductoListado[], total = items.length) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

function abrir() {
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast: vi.fn() }}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<ProductosTab />} />
            <Route path="/productos/platos/nuevo" element={<p>Formulario de plato</p>} />
            <Route path="/productos/postres/nuevo" element={<p>Formulario de postre</p>} />
            <Route path="/productos/bebidas/nuevo" element={<p>Formulario de bebida</p>} />
          </Routes>
        </MemoryRouter>
      </ToastContext.Provider>
    </ConfirmContext.Provider>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProductosTab: filtro', () => {
  it('consulta primero los habilitados y deja el filtro en «Habilitados» (CA 3)', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA]));
    abrir();

    expect(await screen.findByText('Milanesa')).toBeInTheDocument();
    expect(listarProductos).toHaveBeenCalledWith('HABILITADO', 50, 0);
    const filtro = screen.getByLabelText('Filtrar por estado');
    expect(filtro).toHaveValue('HABILITADO');
    expect(Array.from(filtro.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Habilitados',
      'Deshabilitados',
      'Todos',
    ]);
  });

  it.each([
    ['DESHABILITADO', 'Deshabilitados'],
    ['TODOS', 'Todos'],
  ])('al elegir «%s» consulta de nuevo desde el inicio (CA 5, CA 6)', async (valor) => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA]));
    abrir();
    await screen.findByText('Milanesa');

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: valor } });

    await waitFor(() => expect(listarProductos).toHaveBeenCalledWith(valor, 50, 0));
  });

  it('al cambiar el filtro desde la segunda página vuelve a la primera', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA], 120));
    abrir();
    await screen.findByText('Milanesa');
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(listarProductos).toHaveBeenCalledWith('HABILITADO', 50, 50));

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), {
      target: { value: 'TODOS' },
    });

    await waitFor(() => expect(listarProductos).toHaveBeenLastCalledWith('TODOS', 50, 0));
  });

  it('un filtro sin productos muestra su mensaje de vacío (CA 2)', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    abrir();

    expect(await screen.findByText('No hay productos habilitados')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
  });

  it('muestra el error de carga con la opción de reintentar', async () => {
    vi.mocked(listarProductos).mockResolvedValue({ datos: null, exito: false, error: 'Falló' });
    abrir();

    expect(await screen.findByText('Falló')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('ProductosTab: paginación, baja y alta', () => {
  it('muestra la paginación solo si hay más de una página (D-27)', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA], 51));
    abrir();

    expect(await screen.findByRole('navigation', { name: 'Paginación' })).toBeInTheDocument();
  });

  it('al dar de baja desde la fila recarga la lista', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(listarProductos).mockResolvedValueOnce(pagina([MILANESA]));
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...MILANESA, ingredientes: [], descripcion: null, imagen_url: null },
      exito: true,
    });
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: 'Dar de baja «Milanesa»' }));

    expect(await screen.findByText('No hay productos habilitados')).toBeInTheDocument();
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
  });

  it('si la página queda vacía y no es la primera, retrocede una (E22)', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(listarProductos).mockImplementation((_estado, _limite, offset) =>
      Promise.resolve(
        offset === 0
          ? pagina([MILANESA], 51)
          : pagina([{ ...MILANESA, id: 8, nombre: 'Flan' }], 51),
      ),
    );
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...MILANESA, ingredientes: [], descripcion: null, imagen_url: null },
      exito: true,
    });
    abrir();
    await screen.findByText('Milanesa');
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dar de baja «Flan»' }));

    await waitFor(() => expect(listarProductos).toHaveBeenLastCalledWith('HABILITADO', 50, 0));
    expect(await screen.findByText('Milanesa')).toBeInTheDocument();
  });

  it.each([
    ['Nuevo plato', 'Formulario de plato'],
    ['Nuevo postre', 'Formulario de postre'],
    ['Nueva bebida', 'Formulario de bebida'],
  ])('«%s» lleva al formulario de alta', async (boton, formulario) => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: boton }));

    expect(screen.getByText(formulario)).toBeInTheDocument();
  });
});
