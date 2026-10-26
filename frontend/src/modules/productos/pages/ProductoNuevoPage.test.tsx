import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearProducto, listarSeccionesHabilitadas } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta } from '../categorias';
import type { ProductoSalida, SeccionListado } from '../types';

import { ProductoNuevoPage } from './ProductoNuevoPage';

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

const CATEGORIAS: CategoriaAlta[] = ['PLATO', 'POSTRE', 'BEBIDA'];

// Los ingredientes se exigen en platos y postres, no en bebidas (S44)
const AVISOS_INGREDIENTES: Record<CategoriaAlta, number> = { PLATO: 1, POSTRE: 1, BEBIDA: 0 };
const ETIQUETA_INGREDIENTES: Record<CategoriaAlta, string> = {
  PLATO: 'Ingredientes*',
  POSTRE: 'Ingredientes*',
  BEBIDA: 'Ingredientes',
};
const MENSAJE_NOMBRE_REPETIDO: Record<CategoriaAlta, string> = {
  PLATO: 'El plato ya está registrado',
  POSTRE: 'El postre ya está registrado',
  BEBIDA: 'La bebida ya está registrada',
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

async function abrir(categoria: CategoriaAlta) {
  render(
    <MemoryRouter initialEntries={['/productos/nuevo']}>
      <Routes>
        <Route path="/productos/nuevo" element={<ProductoNuevoPage categoria={categoria} />} />
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

describe.each(CATEGORIAS)('ProductoNuevoPage %s: alta', (categoria) => {
  const config = CONFIGURACIONES[categoria];

  it('da de alta el mínimo, avisa y vuelve al listado (CA 1 y CA 14)', async () => {
    secciones([PLATOS, ENTRADAS]);
    vi.mocked(crearProducto).mockResolvedValue({ datos: CREADO, exito: true });
    await abrir(categoria);
    completarMinimo();

    fireEvent.click(screen.getByRole('button', { name: config.botonGuardar }));

    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
    expect(crearProducto).toHaveBeenCalledTimes(1);
    expect(crearProducto).toHaveBeenCalledWith(
      categoria,
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

  it('da de alta el completo con descripción, etiquetas e imagen', async () => {
    secciones([PLATOS]);
    vi.mocked(crearProducto).mockResolvedValue({ datos: CREADO, exito: true });
    await abrir(categoria);
    completarMinimo();
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Con papas' } });
    agregar(/Etiquetas/, 'Casero');
    const foto = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Archivo de imagen'), { target: { files: [foto] } });

    fireEvent.click(screen.getByRole('button', { name: config.botonGuardar }));

    await waitFor(() => expect(crearProducto).toHaveBeenCalledTimes(1));
    expect(crearProducto).toHaveBeenCalledWith(
      categoria,
      expect.objectContaining({ descripcion: 'Con papas', etiquetas: ['Casero'] }),
      foto,
    );
  });
});

describe.each(CATEGORIAS)('ProductoNuevoPage %s: validaciones', (categoria) => {
  const config = CONFIGURACIONES[categoria];

  it('con campos vacíos no envía y marca cada campo obligatorio (CA 2)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    fireEvent.click(screen.getByRole('button', { name: config.botonGuardar }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La sección es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('El precio es obligatorio.')).toBeInTheDocument();
    expect(screen.queryAllByText('Agregue al menos un ingrediente.')).toHaveLength(
      AVISOS_INGREDIENTES[categoria],
    );
    expect(crearProducto).not.toHaveBeenCalled();
  });

  it('advierte el 409 de nombre repetido en el campo y no sale de la página (CA 3)', async () => {
    secciones([PLATOS]);
    vi.mocked(crearProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: MENSAJE_NOMBRE_REPETIDO[categoria],
    });
    await abrir(categoria);
    completarMinimo();

    fireEvent.click(screen.getByRole('button', { name: config.botonGuardar }));

    expect(await screen.findByText(config.nombreRepetido)).toBeInTheDocument();
    expect(screen.queryByText('Listado de productos')).not.toBeInTheDocument();
  });
});

describe.each(CATEGORIAS)('ProductoNuevoPage %s: formulario', (categoria) => {
  const config = CONFIGURACIONES[categoria];

  it('muestra el estado fijo «Habilitado» sin control para cambiarlo (S10)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('el selector lista solo las secciones habilitadas, por orden (CA 9)', async () => {
    secciones([PLATOS, VIEJOS, ENTRADAS]);
    await abrir(categoria);

    const opciones = within(screen.getByLabelText(/Sección/)).getAllByRole('option');

    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      'Seleccione una sección',
      'Platos principales',
      'Entradas',
    ]);
    expect(listarSeccionesHabilitadas).toHaveBeenCalledTimes(1);
  });

  it('muestra el título y las migas de la categoría', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    expect(screen.getAllByText(config.titulo)).toHaveLength(2);
    expect(screen.getByRole('button', { name: config.botonGuardar })).toBeInTheDocument();
  });

  it('rechaza un ingrediente repetido (CA 6)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);
    agregar(/Ingredientes/, 'Huevo');

    agregar(/Ingredientes/, 'huevo');

    expect(screen.getByText('"huevo" ya está en la lista.')).toBeInTheDocument();
  });

  it('ofrece elegir archivo o sacar foto (CA 11)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sacar foto' })).toBeInTheDocument();
  });

  it('cuenta los caracteres de la descripción (CA 7)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);
    expect(screen.getByText('0 / 500')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Con papas' } });

    expect(screen.getByText('9 / 500')).toBeInTheDocument();
  });
});

describe.each(CATEGORIAS)('ProductoNuevoPage %s: sin secciones habilitadas', (categoria) => {
  const config = CONFIGURACIONES[categoria];

  const AVISO = 'Primero hay que crear una sección';

  it.each([
    ['no hay ninguna', [] as SeccionListado[]],
    ['todas están deshabilitadas', [VIEJOS]],
  ])(
    'avisa, enlaza a «Secciones» y deshabilita el botón de guardar si %s (CA 8)',
    async (_, items) => {
      secciones(items);
      render(
        <MemoryRouter>
          <ProductoNuevoPage categoria={categoria} />
        </MemoryRouter>,
      );

      expect(await screen.findByText(AVISO)).toBeInTheDocument();
      expect(screen.getByText(config.avisoSinSecciones, { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ir a Secciones' })).toHaveAttribute(
        'href',
        '/productos?pestania=secciones',
      );
      expect(screen.getByRole('button', { name: config.botonGuardar })).toBeDisabled();
    },
  );

  it('con secciones habilitadas no muestra el aviso y habilita el botón', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: config.botonGuardar })).toBeEnabled();
  });

  it('muestra el error si no se pueden cargar las secciones', async () => {
    vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    render(
      <MemoryRouter>
        <ProductoNuevoPage categoria={categoria} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No se pudo conectar con el backend')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: config.botonGuardar })).toBeDisabled();
  });
});

describe('ProductoNuevoPage BEBIDA: ingredientes opcionales', () => {
  it('guarda sin ingredientes y los envía como lista vacía (S44)', async () => {
    secciones([PLATOS]);
    vi.mocked(crearProducto).mockResolvedValue({ datos: CREADO, exito: true });
    await abrir('BEBIDA');
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Limonada' } });
    fireEvent.change(screen.getByLabelText(/Sección/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '1500' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar bebida' }));

    expect(await screen.findByText('Listado de productos')).toBeInTheDocument();
    expect(crearProducto).toHaveBeenCalledWith(
      'BEBIDA',
      expect.objectContaining({ nombre: 'Limonada', ingredientes: [] }),
      null,
    );
  });

  it('rechaza un chip vacío y uno repetido', async () => {
    secciones([PLATOS]);
    await abrir('BEBIDA');
    agregar(/Ingredientes/, 'Limón');

    agregar(/Ingredientes/, '   ');
    agregar(/Ingredientes/, 'limón');

    expect(screen.getByText('"limón" ya está en la lista.')).toBeInTheDocument();
    expect(screen.getAllByText('Limón')).toHaveLength(1);
  });
});

describe.each(CATEGORIAS)('ProductoNuevoPage %s: ingredientes', (categoria) => {
  it('marca «Ingredientes» con asterisco solo si son obligatorios (S55)', async () => {
    secciones([PLATOS]);
    await abrir(categoria);

    const campo = screen.getByLabelText(/Ingredientes/) as HTMLInputElement;

    expect(campo.labels?.[0]?.textContent).toBe(ETIQUETA_INGREDIENTES[categoria]);
  });
});
