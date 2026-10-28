import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearMenuEjecutivo } from '../api';
import type { MenuEjecutivo } from '../types';

import { useFormularioMenuEjecutivo } from './useFormularioMenuEjecutivo';

vi.mock('../api');

const CREADO: MenuEjecutivo = {
  id: 1,
  nombre: 'Almuerzo ejecutivo',
  descripcion: null,
  precio_fijo: '1500.00',
  estado: 'HABILITADO',
  seccion: { id: 2, nombre: 'Principal' },
  productos: [{ id: 3, nombre: 'Plato', categoria: 'PLATO', estado: 'HABILITADO' }],
};

const mostrarToast = vi.fn();

function preparar() {
  const onCreado = vi.fn();
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <ToastContext.Provider value={{ mostrarToast }}>{children}</ToastContext.Provider>
  );
  const { result } = renderHook(() => useFormularioMenuEjecutivo({ onCreado }), {
    wrapper: envoltorio,
  });
  return { result, onCreado };
}

type Formulario = ReturnType<typeof preparar>['result'];

function completar(result: Formulario) {
  act(() => {
    result.current.actualizar('nombre', '  Almuerzo ejecutivo  ');
    result.current.actualizar('precio_fijo', '1500.00');
    result.current.actualizar('producto_ids', [3]);
    result.current.actualizar('seccion_id', '2');
    result.current.actualizar('descripcion', '   ');
  });
}

afterEach(() => vi.resetAllMocks());

describe('useFormularioMenuEjecutivo', () => {
  it('no envía si faltan datos obligatorios', async () => {
    const { result } = preparar();

    await act(() => result.current.enviar());

    expect(crearMenuEjecutivo).not.toHaveBeenCalled();
    expect(result.current.errores.nombre).toBe('El nombre es obligatorio.');
    expect(result.current.errores.producto_ids).toBe('Incluí al menos un producto.');
  });

  it('recorta datos, crea el menú y actualiza la pantalla', async () => {
    vi.mocked(crearMenuEjecutivo).mockResolvedValue({ datos: CREADO, exito: true });
    const { result, onCreado } = preparar();
    completar(result);

    await act(() => result.current.enviar());

    expect(crearMenuEjecutivo).toHaveBeenCalledWith({
      nombre: 'Almuerzo ejecutivo',
      precio_fijo: '1500.00',
      producto_ids: [3],
      seccion_id: 2,
      descripcion: null,
    });
    expect(mostrarToast).toHaveBeenCalledWith({
      titulo: 'Menú ejecutivo creado',
      variante: 'success',
    });
    expect(onCreado).toHaveBeenCalledOnce();
  });

  it('muestra el conflicto de nombre debajo del campo sin cerrar el formulario', async () => {
    vi.mocked(crearMenuEjecutivo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El nombre del menú ejecutivo ya existe',
    });
    const { result, onCreado } = preparar();
    completar(result);

    await act(() => result.current.enviar());

    expect(result.current.errores.nombre).toBe('Ya existe un menú ejecutivo con ese nombre.');
    expect(result.current.enviando).toBe(false);
    expect(onCreado).not.toHaveBeenCalled();
    expect(mostrarToast).not.toHaveBeenCalled();
  });
});
