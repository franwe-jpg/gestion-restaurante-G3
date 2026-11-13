import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { formatearMoneda } from '../../../shared/lib/format';
import type { ProductoHabilitado } from '../types';

import { SelectorProducto } from './SelectorProducto';
import type { SelectorProductoProps } from './SelectorProducto';
import type { EstadoProductosHabilitados } from './useProductosHabilitados';

const MILANESA: ProductoHabilitado = { id: 12, nombre: 'Milanesa', precio: '1500.50' };
const FLAN: ProductoHabilitado = { id: 13, nombre: 'Flan', precio: '800.00' };

function listo(...productos: ProductoHabilitado[]): EstadoProductosHabilitados {
  return { tipo: 'listo', productos };
}

function mostrar(estado: EstadoProductosHabilitados, props: Partial<SelectorProductoProps> = {}) {
  const onCambiar = vi.fn();
  render(
    <SelectorProducto
      id="producto-1"
      numero={1}
      estado={estado}
      valor=""
      onCambiar={onCambiar}
      {...props}
    />,
  );
  return { onCambiar, selector: screen.getByRole('combobox') };
}

/** Texto y valor de cada opción, en el orden en que se ofrecen. */
function opciones() {
  return screen
    .queryAllByRole<HTMLOptionElement>('option')
    .map((opcion) => [opcion.textContent, opcion.value]);
}

describe('SelectorProducto: con productos', () => {
  it('ofrece «Nombre · precio» con el id del producto como valor, tras «Seleccione un producto»', () => {
    const { selector } = mostrar(listo(MILANESA, FLAN));

    expect(selector).toBeEnabled();
    expect(opciones()).toEqual([
      ['Seleccione un producto', ''],
      [`Milanesa · ${formatearMoneda(1500.5)}`, '12'],
      [`Flan · ${formatearMoneda(800)}`, '13'],
    ]);
  });

  it('muestra el precio con el formato de moneda de la aplicación', () => {
    mostrar(listo(MILANESA));

    const texto = screen.getByRole('option', { name: /Milanesa/ }).textContent ?? '';

    expect(texto).toContain('1.500,50');
    expect(texto).toMatch(/^Milanesa · \$/);
  });

  it('respeta el orden en que recibe los productos', () => {
    mostrar(listo(FLAN, MILANESA));

    expect(opciones().map(([, valor]) => valor)).toEqual(['', '13', '12']);
  });

  it('muestra como elegido el producto del valor recibido', () => {
    const { selector } = mostrar(listo(MILANESA, FLAN), { valor: '13' });

    expect(selector).toHaveValue('13');
  });

  it('al elegir una opción llama a onCambiar con el id como texto', () => {
    const { onCambiar, selector } = mostrar(listo(MILANESA, FLAN));

    fireEvent.change(selector, { target: { value: '13' } });

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('13');
  });

  it('al volver a «Seleccione un producto» llama a onCambiar con texto vacío', () => {
    const { onCambiar, selector } = mostrar(listo(MILANESA), { valor: '12' });

    fireEvent.change(selector, { target: { value: '' } });

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('');
  });
});

describe('SelectorProducto: etiqueta e identificador', () => {
  it('se rotula «Producto {n}» con el número de la línea, sin «(ID)» ni asterisco', () => {
    const { selector } = mostrar(listo(MILANESA), { id: 'producto-3', numero: 3 });

    expect(screen.getByLabelText('Producto 3')).toBe(selector);
    expect(selector.tagName).toBe('SELECT');
    expect(selector).toHaveAttribute('id', 'producto-3');
    expect(screen.queryByLabelText(/\(ID\)/)).toBeNull();
  });
});

describe('SelectorProducto: sin productos para elegir', () => {
  it('cargando: deshabilitado y con «Cargando productos…» como única opción', () => {
    const { selector } = mostrar({ tipo: 'cargando' });

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([['Cargando productos…', '']]);
  });

  it('lista vacía: deshabilitado y con «No hay productos habilitados» como única opción', () => {
    const { selector } = mostrar(listo());

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([['No hay productos habilitados', '']]);
  });

  it('error: deshabilitado y sin opciones; el aviso lo muestra el modal, no cada línea', () => {
    const { selector } = mostrar({ tipo: 'error', mensaje: 'Error de conexión' });

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([]);
    expect(screen.queryByText('Error de conexión')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('SelectorProducto: error del campo', () => {
  it('muestra bajo el campo el error recibido', () => {
    mostrar(listo(MILANESA), { error: 'Seleccione un producto' });

    expect(screen.getByRole('alert')).toHaveTextContent('Seleccione un producto');
  });

  it('sin error no muestra ningún aviso', () => {
    mostrar(listo(MILANESA));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
