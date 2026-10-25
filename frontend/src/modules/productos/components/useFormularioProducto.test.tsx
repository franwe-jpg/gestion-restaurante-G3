import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearProducto } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta } from '../categorias';
import type { ProductoSalida } from '../types';

import { useFormularioProducto } from './useFormularioProducto';

vi.mock('../api');

const CREADO: ProductoSalida = {
  id: 1,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  ingredientes: ['Carne'],
  descripcion: null,
  etiquetas: [],
  estado: 'HABILITADO',
  seccion: { id: 3, nombre: 'Platos' },
  imagen_url: null,
};

const CATEGORIAS: CategoriaAlta[] = ['PLATO', 'POSTRE'];

const mostrarToast = vi.fn();

function preparar(categoria: CategoriaAlta) {
  const onCreado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioProducto({ categoria, onCreado }), {
    wrapper: envoltorio,
  });
  return { result, onCreado };
}

type Formulario = ReturnType<typeof preparar>['result'];

function completarMinimo(result: Formulario) {
  act(() => {
    result.current.setNombre('  Milanesa ');
    result.current.setSeccionId('3');
    result.current.setPrecio('12.500,50');
    result.current.setIngredientes(['Carne']);
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe.each(CATEGORIAS)('useFormularioProducto %s: validación', (categoria) => {
  it('con campos vacíos no envía y marca qué falta (CA 2)', async () => {
    const { result } = preparar(categoria);

    await act(() => result.current.enviar());

    expect(crearProducto).not.toHaveBeenCalled();
    expect(result.current.errores).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      seccionId: 'La sección es obligatoria.',
      precio: 'El precio es obligatorio.',
      ingredientes: 'Agregue al menos un ingrediente.',
    });
  });

  it('con un precio inválido no envía (CA 5)', async () => {
    const { result } = preparar(categoria);
    completarMinimo(result);
    act(() => result.current.setPrecio('abc'));

    await act(() => result.current.enviar());

    expect(crearProducto).not.toHaveBeenCalled();
    expect(result.current.errores.precio).toMatch(/precio es inválido/);
  });
});

describe.each(CATEGORIAS)('useFormularioProducto %s: alta', (categoria) => {
  it('envía el alta mínima convertida, avisa y notifica (CA 1 y CA 14)', async () => {
    vi.mocked(crearProducto).mockResolvedValue({ datos: CREADO, exito: true });
    const { result, onCreado } = preparar(categoria);
    completarMinimo(result);

    await act(() => result.current.enviar());

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
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: CONFIGURACIONES[categoria].creado, variante: 'success' }),
    );
    expect(onCreado).toHaveBeenCalledTimes(1);
  });

  it('envía descripción, etiquetas e imagen cuando se cargan', async () => {
    vi.mocked(crearProducto).mockResolvedValue({ datos: CREADO, exito: true });
    const { result } = preparar(categoria);
    completarMinimo(result);
    const foto = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    act(() => {
      result.current.setDescripcion('  Con papas ');
      result.current.setEtiquetas(['Casero']);
      result.current.setImagen(foto);
    });

    await act(() => result.current.enviar());

    expect(crearProducto).toHaveBeenCalledWith(
      categoria,
      expect.objectContaining({ descripcion: 'Con papas', etiquetas: ['Casero'] }),
      foto,
    );
  });
});

describe.each(CATEGORIAS)('useFormularioProducto %s: envío en curso', (categoria) => {
  it('marca «enviando» mientras espera y no envía dos veces', async () => {
    let terminar: (valor: Awaited<ReturnType<typeof crearProducto>>) => void = () => undefined;
    vi.mocked(crearProducto).mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    const { result } = preparar(categoria);
    completarMinimo(result);

    act(() => void result.current.enviar());
    await waitFor(() => expect(result.current.enviando).toBe(true));
    await act(() => result.current.enviar());
    expect(crearProducto).toHaveBeenCalledTimes(1);

    await act(async () => terminar({ datos: CREADO, exito: true }));
    expect(result.current.enviando).toBe(false);
  });
});

describe.each(CATEGORIAS)('useFormularioProducto %s: errores del servidor', (categoria) => {
  it('ubica el 409 de nombre repetido en el campo y no avisa éxito (CA 3)', async () => {
    vi.mocked(crearProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: `El ${categoria === 'PLATO' ? 'plato' : 'postre'} ya está registrado`,
    });
    const { result, onCreado } = preparar(categoria);
    completarMinimo(result);

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ nombre: CONFIGURACIONES[categoria].nombreRepetido });
    expect(onCreado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
    expect(result.current.enviando).toBe(false);
  });

  it('muestra como error general lo que no es de un campo', async () => {
    vi.mocked(crearProducto).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo conectar con el backend',
    });
    const { result } = preparar(categoria);
    completarMinimo(result);

    await act(() => result.current.enviar());

    expect(result.current.errores).toEqual({ general: 'No se pudo conectar con el backend' });
  });
});
