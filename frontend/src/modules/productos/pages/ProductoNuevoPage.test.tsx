import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearPlato, listarSeccionesHabilitadas } from '../api';
import type { ProductoSalida, SeccionListado } from '../types';

import { PlatoNuevoPage } from './PlatoNuevoPage';

vi.mock('../api');

const PLATOS: SeccionListado = {
  id: 3,
  nombre: 'Platos principales',
  orden: 1,
  estado: 'HABILITADO',
  cantidad_productos: 0,
};
const ENTRADAS: SeccionListado = { ...PLATOS, id: 4, nombre: 'Entradas', orden: 2 };
const VIEJOS: SeccionListado = {
  ...PLATOS,
  id: 5,
  nombre: 'Viejos',
  orden: 3,
  estado: 'DESHABILITADO',
};

const CREADO: ProductoSalida = {
  id: 1,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  ingredientes: ['Carne'],
  descripcion: null,
  etiquetas: [],
  estado: 'HABILITADO',
  seccion: { id: 3, nombre: 'Platos principales' },
  imagen_url: null,
};

function secciones(items: SeccionListado[]) {
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: { items, total: items.length, limit: 100, offset: 0 },
    exito: true,
  });
}

async function abrir() {
  render(
    <MemoryRouter initialEntries={['/productos/nuevo']}>
      <Routes>
        <Route path="/productos/nuevo" element={<PlatoNuevoPage />} />
        <Route path="/productos" element={<p>Listado de productos</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByLabelText(/Nombre/);
}

function agregar(etiqueta: RegExp, texto: string) {
  const campo = screen.getByLabelText(etiqueta);
  fireEvent.change(campo, { target: { value: texto } });
  fireEvent.keyDown(campo, { key: 'Enter' });
}

function completarMinimo() {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: ' Milanesa ' } });
  fireEvent.change(screen.getByLabelText(/Sección/), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '12.500,50' } });
  agregar(/Ingredientes/, 'Carne');
}

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:previa'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
  vi.resetAllMocks();
});

describe('PlatoNuevoPage: alta', () => {
  it('da de alta el plato mínimo, avisa y vuelve al listado (CA 1 y CA 14)', async () => {
    secciones([PLATOS, ENTRADAS]);
    vi.mocked(crearPlato).mockResolvedValue({ datos: CREADO, exito: true });
    await abrir();
    completarMinimo();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
    expect(crearPlato).toHaveBeenCalledTimes(1);
    expect(crearPlato).toHaveBeenCalledWith(
      {
        nombre: 'Milanesa',
        seccion_id: 3,
        precio: '12500.50',
        ingredientes: ['Carne'],
        descripcion: null,
        etiquetas: [],
      },
      null,
    );
  });

  it('da de alta el plato completo con descripción, etiquetas e imagen', async () => {
    secciones([PLATOS]);
    vi.mocked(crearPlato).mockResolvedValue({ datos: CREADO, exito: true });
    await abrir();
    completarMinimo();
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Con papas' } });
    agregar(/Etiquetas/, 'Casero');
    const foto = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [foto] } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    await waitFor(() => expect(crearPlato).toHaveBeenCalledTimes(1));
    expect(crearPlato).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: 'Con papas', etiquetas: ['Casero'] }),
      foto,
    );
  });
});

describe('PlatoNuevoPage: validaciones', () => {
  it('con campos vacíos no envía y marca cada campo obligatorio (CA 2)', async () => {
    secciones([PLATOS]);
    await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La sección es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('El precio es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Agregue al menos un ingrediente.')).toBeInTheDocument();
    expect(crearPlato).not.toHaveBeenCalled();
  });

  it('advierte el 409 de nombre repetido en el campo y no sale de la página (CA 3)', async () => {
    secciones([PLATOS]);
    vi.mocked(crearPlato).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El plato ya está registrado',
    });
    await abrir();
    completarMinimo();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar plato' }));

    expect(await screen.findByText('El plato ya está registrado.')).toBeInTheDocument();
    expect(screen.queryByText('Listado de productos')).not.toBeInTheDocument();
  });
});

describe('PlatoNuevoPage: formulario', () => {
  it('muestra el estado fijo «Habilitado» sin control para cambiarlo (S10)', async () => {
    secciones([PLATOS]);
    await abrir();

    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('el selector lista solo las secciones habilitadas, por orden (CA 9)', async () => {
    secciones([PLATOS, VIEJOS, ENTRADAS]);
    await abrir();

    const opciones = within(screen.getByLabelText(/Sección/)).getAllByRole('option');

    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      'Seleccione una sección',
      'Platos principales',
      'Entradas',
    ]);
    expect(listarSeccionesHabilitadas).toHaveBeenCalledTimes(1);
  });

  it('cuenta los caracteres de la descripción (CA 7)', async () => {
    secciones([PLATOS]);
    await abrir();
    expect(screen.getByText('0 / 500')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Con papas' } });

    expect(screen.getByText('9 / 500')).toBeInTheDocument();
  });
});

describe('PlatoNuevoPage: sin secciones habilitadas', () => {
  const AVISO = 'Primero hay que crear una sección';

  it.each([
    ['no hay ninguna', [] as SeccionListado[]],
    ['todas están deshabilitadas', [VIEJOS]],
  ])('avisa, enlaza a «Secciones» y deshabilita «Guardar plato» si %s (CA 8)', async (_, items) => {
    secciones(items);
    render(
      <MemoryRouter>
        <PlatoNuevoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Secciones' })).toHaveAttribute(
      'href',
      '/productos?pestania=secciones',
    );
    expect(screen.getByRole('button', { name: 'Guardar plato' })).toBeDisabled();
  });

  it('con secciones habilitadas no muestra el aviso y habilita el botón', async () => {
    secciones([PLATOS]);
    await abrir();

    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar plato' })).toBeEnabled();
  });

  it('muestra el error si no se pueden cargar las secciones', async () => {
    vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    render(
      <MemoryRouter>
        <PlatoNuevoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar plato' })).toBeDisabled();
  });
});
