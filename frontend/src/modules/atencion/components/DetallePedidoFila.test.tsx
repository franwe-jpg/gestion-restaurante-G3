import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { formatearMoneda } from '../../../shared/lib/format';
import { DetallePedidoFila } from './DetallePedidoFila';
import type { LineaPedido } from './DetallePedidoFila';

const PRODUCTOS = [
  { id: 11, nombre: 'Milanesa', precio: '9000.00', estado: 'HABILITADO' as const },
];
const MENUS = [
  { id: 21, nombre: 'Menú del día', precio_fijo: '12000.00', estado: 'HABILITADO' as const },
];
const LINEA: LineaPedido = { clave: 0, tipo: 'producto', referencia: '', cantidad: '1' };

function montar(linea = LINEA, productos = PRODUCTOS, menus = MENUS, onChange = vi.fn()) {
  render(
    <DetallePedidoFila
      linea={linea}
      numero={1}
      puedeQuitar
      productos={productos}
      menus={menus}
      onChange={onChange}
      onQuitar={vi.fn()}
    />,
  );
  return onChange;
}

it('ofrece un selector con nombre y precio de cada producto y no pide un ID', () => {
  const onChange = montar();
  const selector = screen.getByLabelText('Producto 1');
  expect(
    within(selector).getByRole('option', {
      name: `Milanesa · ${formatearMoneda(9000)}`,
    }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/\(ID\)/)).not.toBeInTheDocument();
  fireEvent.change(selector, { target: { value: '11' } });
  expect(onChange).toHaveBeenCalledWith({ ...LINEA, referencia: '11' });
});

it('al cambiar el tipo a menú vacía la selección previa', () => {
  const onChange = montar({ ...LINEA, referencia: '11' });
  fireEvent.change(screen.getByLabelText('Tipo 1'), { target: { value: 'menu' } });
  expect(onChange).toHaveBeenCalledWith({ ...LINEA, tipo: 'menu', referencia: '' });
});

it('lista los menús habilitados cuando el tipo es menú', () => {
  montar({ ...LINEA, tipo: 'menu' });
  expect(
    within(screen.getByLabelText('Menú 1')).getByRole('option', {
      name: `Menú del día · ${formatearMoneda(12000)}`,
    }),
  ).toBeInTheDocument();
});

it('informa cuando no hay productos o menús habilitados', () => {
  montar(LINEA, [], []);
  expect(screen.getByText('No hay productos habilitados')).toBeInTheDocument();
});

it('informa cuando no hay menús habilitados', () => {
  montar({ ...LINEA, tipo: 'menu' }, PRODUCTOS, []);
  expect(screen.getByText('No hay menús habilitados')).toBeInTheDocument();
});
