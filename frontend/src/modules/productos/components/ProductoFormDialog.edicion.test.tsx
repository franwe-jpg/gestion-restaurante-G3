import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

import { ProductoFormDialog } from './ProductoFormDialog';

vi.mock('../api');

const PLATOS: SeccionListado = {
  id: 3,
  nombre: 'Platos principales',
  orden: 1,
  estado: 'HABILITADO',
  cantidad_productos: 0,
  productos_habilitados: 0,
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
const onGuardado = vi.fn();
const onDadoDeBaja = vi.fn();
const onOpenChange = vi.fn();

function responder(plato: ProductoSalida = PLATO, items: SeccionListado[] = [PLATOS, ENTRADAS]) {
  vi.mocked(obtenerProducto).mockResolvedValue({ datos: plato, exito: true });
  vi.mocked(listarSeccionesHabilitadas).mockResolvedValue({
    datos: { items, total: items.length, limit: 100, offset: 0 },
    exito: true,
  });
}

async function abrir(id = 7, categoria: 'PLATO' | 'POSTRE' | 'BEBIDA' = 'PLATO') {
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ConfirmProvider>
        <MemoryRouter>
          <ProductoFormDialog
            categoria={categoria}
            productoId={id}
            onGuardado={onGuardado}
            onDadoDeBaja={onDadoDeBaja}
            onOpenChange={onOpenChange}
          />
        </MemoryRouter>
      </ConfirmProvider>
    </ToastContext.Provider>,
  );
}

/** El diálogo de confirmación de la baja se abre sobre el del formulario. */
function dialogoDeBaja(nombre: string) {
  return screen.findByRole('dialog', { name: `¿Dar de baja «${nombre}»?` });
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

describe('ProductoFormDialog edición: formulario cargado', () => {
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

describe('ProductoFormDialog edición: diálogo', () => {
  it('se abre como diálogo «Editar plato»', async () => {
    await abrirCargado();

    expect(screen.getByRole('dialog', { name: 'Editar plato' })).toBeInTheDocument();
  });

  it('mientras carga deshabilita «Guardar cambios» y deja cancelar', async () => {
    vi.mocked(obtenerProducto).mockReturnValue(new Promise(() => undefined));
    await abrir();

    expect(await screen.findByText('Cargando plato...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('«Cancelar» cierra el diálogo sin enviar nada', async () => {
    await abrirCargado();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Otro' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(modificarProducto).not.toHaveBeenCalled();
  });
});

describe('ProductoFormDialog edición: guardar', () => {
  it('guarda con una sola solicitud PUT, avisa y pide cerrar el diálogo', async () => {
    await abrirCargado();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: PLATO, exito: true });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '13.000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
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

describe('ProductoFormDialog edición: errores al guardar', () => {
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
    expect(onGuardado).not.toHaveBeenCalled();
  });
});

describe('ProductoFormDialog edición: estado y baja', () => {
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

  it('da de baja tras confirmar, avisa y pide cerrar el diálogo', async () => {
    await abrirCargado();
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...PLATO, estado: 'DESHABILITADO' },
      exito: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await dialogoDeBaja('Milanesa');
    expect(within(dialogo).getByText('¿Dar de baja «Milanesa»?')).toBeInTheDocument();
    expect(
      within(dialogo).getByText(
        'El plato quedará deshabilitado y dejará de mostrarse en la carta. Puede volver a habilitarlo desde la pantalla de edición.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).toHaveBeenCalledWith('PLATO', 7);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Plato dado de baja' }),
    );
  });

  it('cancelar el diálogo no envía ninguna solicitud', async () => {
    await abrirCargado();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await dialogoDeBaja('Milanesa');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(dialogo).not.toBeInTheDocument());
    expect(darDeBajaProducto).not.toHaveBeenCalled();
    expect(onDadoDeBaja).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Editar plato' })).toBeInTheDocument();
  });
});

describe('ProductoFormDialog edición: plato inexistente y secciones', () => {
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

const POSTRE: ProductoSalida = {
  ...PLATO,
  id: 9,
  nombre: 'Flan',
  categoria: 'POSTRE',
  ingredientes: ['Leche', 'Huevo'],
};

async function abrirPostre(postre: ProductoSalida = POSTRE) {
  responder(postre);
  await abrir(9, 'POSTRE');
  await screen.findByDisplayValue(postre.nombre);
}

describe('ProductoFormDialog edición: postres', () => {
  it('muestra «Cargando postre...» mientras carga', async () => {
    vi.mocked(obtenerProducto).mockReturnValue(new Promise(() => undefined));
    await abrir(9, 'POSTRE');

    expect(await screen.findByText('Cargando postre...')).toBeInTheDocument();
  });

  it('muestra los datos del postre con «Editar postre»', async () => {
    await abrirPostre();

    expect(screen.getByRole('heading', { name: 'Editar postre' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Flan');
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(obtenerProducto).toHaveBeenCalledWith('POSTRE', 9);
  });

  it('guarda con la categoría POSTRE, avisa y pide cerrar el diálogo', async () => {
    await abrirPostre();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: POSTRE, exito: true });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '13.000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarProducto).toHaveBeenCalledWith(
      'POSTRE',
      9,
      expect.objectContaining({ precio: '13000' }),
      null,
    );
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Postre modificado' }),
    );
  });
});

describe('ProductoFormDialog edición: postres, errores y baja', () => {
  it('un 404 muestra «El postre no existe.»', async () => {
    vi.mocked(obtenerProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El producto 9 no existe',
    });
    await abrir(9, 'POSTRE');

    expect(await screen.findByText('El postre no existe.')).toBeInTheDocument();
  });

  it('da de baja tras confirmar, avisa y pide cerrar el diálogo', async () => {
    await abrirPostre();
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...POSTRE, estado: 'DESHABILITADO' },
      exito: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await dialogoDeBaja('Flan');
    expect(within(dialogo).getByText(/El postre quedará deshabilitado/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).toHaveBeenCalledWith('POSTRE', 9);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Postre dado de baja' }),
    );
  });

  it('un postre deshabilitado no ofrece «Dar de baja» y tiene el interruptor apagado', async () => {
    await abrirPostre({ ...POSTRE, estado: 'DESHABILITADO' });

    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Habilitado' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

const BEBIDA: ProductoSalida = {
  ...PLATO,
  id: 11,
  nombre: 'Limonada',
  categoria: 'BEBIDA',
  ingredientes: ['Limón'],
};

async function abrirBebida(bebida: ProductoSalida = BEBIDA) {
  responder(bebida);
  await abrir(11, 'BEBIDA');
  await screen.findByDisplayValue(bebida.nombre);
}

describe('ProductoFormDialog edición: bebidas', () => {
  it('muestra «Cargando bebida...» mientras carga', async () => {
    vi.mocked(obtenerProducto).mockReturnValue(new Promise(() => undefined));
    await abrir(11, 'BEBIDA');

    expect(await screen.findByText('Cargando bebida...')).toBeInTheDocument();
  });

  it('muestra los datos de la bebida con «Editar bebida» y sin asterisco en ingredientes', async () => {
    await abrirBebida();

    expect(screen.getByRole('heading', { name: 'Editar bebida' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Limonada');
    expect(screen.getByText('Limón')).toBeInTheDocument();
    const ingredientes = screen.getByLabelText(/Ingredientes/) as HTMLInputElement;
    expect(ingredientes.labels?.[0]?.textContent).toBe('Ingredientes');
    expect(obtenerProducto).toHaveBeenCalledWith('BEBIDA', 11);
  });

  it('guarda con la categoría BEBIDA, avisa y pide cerrar el diálogo', async () => {
    await abrirBebida();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: BEBIDA, exito: true });
    fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '13.000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarProducto).toHaveBeenCalledWith(
      'BEBIDA',
      11,
      expect.objectContaining({ precio: '13000' }),
      null,
    );
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Bebida modificada' }),
    );
  });

  it('guarda tras quitar todos los chips de ingredientes (S44)', async () => {
    await abrirBebida();
    vi.mocked(modificarProducto).mockResolvedValue({ datos: BEBIDA, exito: true });
    fireEvent.click(screen.getByRole('button', { name: /Quitar.*Limón/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarProducto).toHaveBeenCalledWith(
      'BEBIDA',
      11,
      expect.objectContaining({ ingredientes: [] }),
      null,
    );
  });
});

describe('ProductoFormDialog edición: bebidas, errores y baja', () => {
  it('un 404 muestra «La bebida no existe.»', async () => {
    vi.mocked(obtenerProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El producto 11 no existe',
    });
    await abrir(11, 'BEBIDA');

    expect(await screen.findByText('La bebida no existe.')).toBeInTheDocument();
  });

  it('da de baja tras confirmar, avisa y pide cerrar el diálogo', async () => {
    await abrirBebida();
    vi.mocked(darDeBajaProducto).mockResolvedValue({
      datos: { ...BEBIDA, estado: 'DESHABILITADO' },
      exito: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    const dialogo = await dialogoDeBaja('Limonada');
    expect(within(dialogo).getByText(/La bebida quedará deshabilitada/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() => expect(onDadoDeBaja).toHaveBeenCalledTimes(1));
    expect(darDeBajaProducto).toHaveBeenCalledWith('BEBIDA', 11);
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Bebida dada de baja' }),
    );
  });

  it('una bebida deshabilitada no ofrece «Dar de baja» y tiene el interruptor apagado', async () => {
    await abrirBebida({ ...BEBIDA, estado: 'DESHABILITADO' });

    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Habilitado' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});
