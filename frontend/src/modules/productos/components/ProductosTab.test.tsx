import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmContext } from '../../../shared/components/ui/confirm-context';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import {
  crearProducto,
  darDeBajaProducto,
  listarProductos,
  listarSeccionesHabilitadas,
  modificarProducto,
  obtenerProducto,
} from '../api';
import type { ProductoListado, ProductoSalida } from '../types';

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

const COMPLETO: ProductoSalida = {
  ...MILANESA,
  ingredientes: ['Pan'],
  descripcion: null,
  imagen_url: null,
};

const confirmar = vi.fn();

function pagina(items: ProductoListado[], total = items.length) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

const onIrASecciones = vi.fn();

function abrir() {
  render(
    <ConfirmContext.Provider value={confirmar}>
      <ToastContext.Provider value={{ mostrarToast: vi.fn() }}>
        <MemoryRouter>
          <ProductosTab onIrASecciones={onIrASecciones} />
        </MemoryRouter>
      </ToastContext.Provider>
    </ConfirmContext.Provider>,
  );
}

function seccionesHabilitadas(items: { id: number; nombre: string }[]) {
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: {
      items: items.map((s) => ({
        ...s,
        orden: 1,
        estado: 'HABILITADO' as const,
        cantidad_productos: 0,
        productos_habilitados: 0,
      })),
      total: items.length,
      limit: 100,
      offset: 0,
    },
    exito: true,
  });
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

describe('ProductosTab: paginación y baja', () => {
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
});

describe('ProductosTab: diálogo de alta', () => {
  it.each([
    ['Nuevo plato', 'PLATO'],
    ['Nuevo postre', 'POSTRE'],
    ['Nueva bebida', 'BEBIDA'],
  ])('«%s» abre el formulario en un diálogo sobre la lista', async (boton) => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA]));
    seccionesHabilitadas([{ id: 3, nombre: 'Platos' }]);
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: boton }));

    expect(await screen.findByRole('dialog', { name: boton })).toBeInTheDocument();
    expect(screen.getByText('Milanesa')).toBeInTheDocument();
  });

  it('al crear cierra el diálogo y recarga la lista', async () => {
    vi.mocked(listarProductos).mockResolvedValueOnce(pagina([]));
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA]));
    seccionesHabilitadas([{ id: 3, nombre: 'Platos' }]);
    vi.mocked(crearProducto).mockResolvedValue({ datos: COMPLETO, exito: true });
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva bebida' }));
    fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: 'Agua' } });
    fireEvent.change(screen.getByLabelText(/Sección/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '1500' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar bebida' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Milanesa')).toBeInTheDocument();
    expect(listarProductos).toHaveBeenCalledTimes(2);
  });

  it('«Cancelar» cierra el diálogo sin recargar la lista', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    seccionesHabilitadas([]);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo plato' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(listarProductos).toHaveBeenCalledTimes(1);
  });
});

describe('ProductosTab: diálogo de edición', () => {
  it('«Editar» abre el producto en un diálogo y al guardar recarga la lista', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([MILANESA]));
    seccionesHabilitadas([{ id: 3, nombre: 'Platos' }]);
    vi.mocked(obtenerProducto).mockResolvedValue({ datos: COMPLETO, exito: true });
    vi.mocked(modificarProducto).mockResolvedValue({ datos: COMPLETO, exito: true });
    abrir();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar «Milanesa»' }));
    // Primero se ve «Cargando plato...»; el formulario aparece cuando llega el producto.
    expect(await screen.findByDisplayValue('Milanesa')).toBeInTheDocument();
    const dialogo = screen.getByRole('dialog', { name: 'Editar plato' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(obtenerProducto).toHaveBeenCalledWith('PLATO', 7);
    await waitFor(() => expect(listarProductos).toHaveBeenCalledTimes(2));
  });

  it('«Ir a Secciones» cierra el diálogo y pide pasar a la pestaña', async () => {
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    seccionesHabilitadas([]);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo postre' }));

    fireEvent.click(await screen.findByRole('link', { name: 'Ir a Secciones' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onIrASecciones).toHaveBeenCalledTimes(1);
  });
});

describe('ProductosTab: baja desde el diálogo de edición', () => {
  it('al dar de baja cierra el diálogo y recarga la lista', async () => {
    confirmar.mockResolvedValue(true);
    vi.mocked(listarProductos).mockResolvedValueOnce(pagina([MILANESA]));
    vi.mocked(listarProductos).mockResolvedValue(pagina([]));
    seccionesHabilitadas([{ id: 3, nombre: 'Platos' }]);
    vi.mocked(obtenerProducto).mockResolvedValue({ datos: COMPLETO, exito: true });
    vi.mocked(darDeBajaProducto).mockResolvedValue({ datos: COMPLETO, exito: true });
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar «Milanesa»' }));
    await screen.findByDisplayValue('Milanesa');
    const dialogo = screen.getByRole('dialog', { name: 'Editar plato' });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar de baja' }));

    expect(await screen.findByText('No hay productos habilitados')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
  });
});
