import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from '../../../shared/components/ui/confirm-dialog';
import { ToastContext } from '../../../shared/components/ui/toast-context';
import {
  darDeBajaProducto,
  listarSeccionesHabilitadas,
  modificarProducto,
  obtenerProducto,
  urlDeImagen,
} from '../api';
import type { ProductoSalida, SeccionListado } from '../types';

import { ProductoEditarPage } from './ProductoEditarPage';

vi.mock('../api');

const PLATOS: SeccionListado = {
  id: 3,
  nombre: 'Platos principales',
  orden: 1,
  estado: 'HABILITADO',
  cantidad_productos: 0,
};
const ENTRADAS: SeccionListado = { ...PLATOS, id: 4, nombre: 'Entradas', orden: 2 };

const PLATO: ProductoSalida = {
  id: 7,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  ingredientes: ['Pan', 'Huevo'],
  descripcion: 'Con papas',
  etiquetas: ['Casero'],
  estado: 'HABILITADO',
  seccion: { id: 3, nombre: 'Platos principales' },
  imagen_url: '/media/a.jpg',
};

const mostrarToast = vi.fn();

function responder(plato: ProductoSalida = PLATO, items: SeccionListado[] = [PLATOS, ENTRADAS]) {
  vi.mocked(obtenerProducto).mockResolvedValue({ datos: plato, exito: true });
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: { items, total: items.length, limit: 100, offset: 0 },
    exito: true,
  });
}

async function abrir(id = '7') {
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ConfirmProvider>
        <MemoryRouter initialEntries={[`/productos/platos/${id}/editar`]}>
          <Routes>
            <Route
              path="/productos/platos/:id/editar"
              element={<ProductoEditarPage categoria="PLATO" />}
            />
            <Route path="/productos" element={<p>Listado de productos</p>} />
          </Routes>
        </MemoryRouter>
      </ConfirmProvider>
    </ToastContext.Provider>,
  );
}

async function abrirCargado(plato: ProductoSalida = PLATO) {
  responder(plato);
  await abrir();
  await screen.findByDisplayValue(plato.nombre);
}

function agregar(etiqueta: RegExp, texto: string) {
  const campo = screen.getByLabelText(etiqueta);
  fireEvent.change(campo, { target: { value: texto } });
  fireEvent.keyDown(campo, { key: 'Enter' });
}

beforeEach(() => {
  vi.mocked(urlDeImagen).mockReturnValue('http://api.test/media/a.jpg');
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: { items: [], total: 0, limit: 100, offset: 0 },
    exito: true,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProductoEditarPage: formulario cargado', () => {
  it('muestra los datos actuales con «Editar plato» y «Guardar cambios»', async () => {
    await abrirCargado();

    expect(screen.getByRole('heading', { name: 'Editar plato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Milanesa');
    expect(screen.getByLabelText(/Sección/)).toHaveValue('3');
    expect(screen.getByLabelText(/Precio/)).toHaveValue('12.500,50');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('Con papas');
    expect(screen.getByText('Pan')).toBeInTheDocument();
    expect(screen.getByText('Casero')).toBeInTheDocument();
    expect(obtenerProducto).toHaveBeenCalledWith('PLATO', 7);
  });

  it('muestra la imagen actual con su URL absoluta', async () => {
    await abrirCargado();

    expect(screen.getByRole('img', { name: 'Imagen actual' })).toHaveAttribute(
      'src',
      'http://api.test/media/a.jpg',
    );
  });

  it('el estado es un interruptor «Habilitado» encendido', async () => {
    await abrirCargado();

    expect(screen.getByRole('switch', { name: 'Habilitado' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('ProductoEditarPage: guardar', () => {
  it('guarda con una sola solicitud PUT, avisa y vuelve a «Productos»', async () => {
    await abrirCargado();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '13.000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
    expect(modificarProducto).toHaveBeenCalledTimes(1);
    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ precio: '13000', estado: 'HABILITADO', quitar_imagen: false }),
      null,
    );
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato modificado' }),
    );
  });

  it('envía los chips cambiados y la imagen quitada', async () => {
    await abrirCargado();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    fireEvent.click(screen.getByRole('button', { name: /Quitar.*Huevo/ }));
    agregar(/Ingredientes/, 'Queso');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(modificarProducto).toHaveBeenCalledTimes(1));
    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ ingredientes: ['Pan', 'Queso'], quitar_imagen: true }),
      null,
    );
  });
});

describe('ProductoEditarPage: errores al guardar', () => {
  it('con errores locales no envía y marca cada campo', async () => {
    await abrirCargado();
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText(/El precio es inválido/)).toBeInTheDocument();
    expect(modificarProducto).not.toHaveBeenCalled();
  });

  it('muestra el 409 bajo el nombre y conserva lo escrito', async () => {
    await abrirCargado();
    vi.mocked(modificarProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El plato ya está registrado',
    });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Flan' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El plato ya está registrado.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Flan');
    expect(screen.queryByText('Listado de productos')).not.toBeInTheDocument();
  });
});

describe('ProductoEditarPage: estado y baja', () => {
  it('reactiva un plato deshabilitado desde el formulario', async () => {
    await abrirCargado({ ...PLATO, estado: 'DESHABILITADO' });
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    const interruptor = screen.getByRole('switch', { name: 'Habilitado' });
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();

    fireEvent.click(interruptor);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(modificarProducto).toHaveBeenCalledTimes(1));
    expect(modificarProducto).toHaveBeenCalledWith(
      'PLATO',
      7,
      expect.objectContaining({ estado: 'HABILITADO' }),
      null,
    );
  });

  it('da de baja tras confirmar en el diálogo, avisa y vuelve', async () => {
    await abrirCargado();
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...PLATO, estado: 'DESHABILITADO' },
      exito: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('¿Dar de baja «Milanesa»?')).toBeInTheDocument();
    expect(
      within(dialogo).getByText(
        'El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar de baja' }));

    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato dado de baja' }),
    );
  });

  it('cancelar el diálogo no envía ninguna solicitud', async () => {
    await abrirCargado();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(darDeBajaProducto).not.toHaveBeenCalled();
    expect(screen.queryByText('Listado de productos')).not.toBeInTheDocument();
  });
});

describe('ProductoEditarPage: plato inexistente y secciones', () => {
  it('un id inválido muestra «El plato no existe.» sin llamar a la API', async () => {
    await abrir('abc');

    expect(await screen.findByText('El plato no existe.')).toBeInTheDocument();
    expect(obtenerProducto).not.toHaveBeenCalled();
  });

  it('un 404 muestra «El plato no existe.»', async () => {
    vi.mocked(obtenerProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El producto 7 no existe',
    });
    await abrir();

    expect(await screen.findByText('El plato no existe.')).toBeInTheDocument();
  });

  it('otro error de carga muestra el mensaje del servidor', async () => {
    vi.mocked(obtenerProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    await abrir();

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
  });

  it('agrega la sección actual deshabilitada al selector con su sufijo', async () => {
    responder({ ...PLATO, seccion: { id: 5, nombre: 'Viejos' } }, [PLATOS]);
    await abrir();
    await screen.findByDisplayValue('Milanesa');

    const selector = screen.getByLabelText(/Sección/);
    const opciones = within(selector)
      .getAllByRole('option')
      .map((o) => o.textContent);

    expect(opciones).toEqual([
      'Seleccione una sección',
      'Platos principales',
      'Viejos (deshabilitada)',
    ]);
    expect(selector).toHaveValue('5');
  });

  it('no repite la sección actual si ya está habilitada', async () => {
    await abrirCargado();

    const opciones = within(screen.getByLabelText(/Sección/)).getAllByRole('option');

    expect(opciones.map((o) => o.textContent)).toEqual([
      'Seleccione una sección',
      'Platos principales',
      'Entradas',
    ]);
  });
});
