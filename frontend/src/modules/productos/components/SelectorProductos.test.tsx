import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductoSeleccionable } from '../types';

import { SelectorProductos } from './SelectorProductos';

const PRODUCTOS: ProductoSeleccionable[] = [
  { id: 4, nombre: 'Flan', categoria: 'POSTRE', seccion: { id: 1, nombre: 'Postres' } },
  { id: 7, nombre: 'Milanesa', categoria: 'PLATO', seccion: { id: 2, nombre: 'Platos' } },
];

describe('SelectorProductos', () => {
  it('muestra cada producto con su sección actual', () => {
    render(<SelectorProductos productos={PRODUCTOS} seleccionados={[]} onCambiar={vi.fn()} />);

    expect(screen.getByLabelText('Flan (sección actual: Postres)')).not.toBeChecked();
    expect(screen.getByLabelText('Milanesa (sección actual: Platos)')).toBeInTheDocument();
  });

  it('agrega y quita ids de la selección', () => {
    const onCambiar = vi.fn();
    const { rerender } = render(
      <SelectorProductos productos={PRODUCTOS} seleccionados={[4]} onCambiar={onCambiar} />,
    );

    fireEvent.click(screen.getByLabelText('Milanesa (sección actual: Platos)'));
    expect(onCambiar).toHaveBeenLastCalledWith([4, 7]);

    rerender(<SelectorProductos productos={PRODUCTOS} seleccionados={[4]} onCambiar={onCambiar} />);
    fireEvent.click(screen.getByLabelText('Flan (sección actual: Postres)'));
    expect(onCambiar).toHaveBeenLastCalledWith([]);
  });

  it('aparece vacío cuando no hay productos habilitados', () => {
    render(<SelectorProductos productos={[]} seleccionados={[]} onCambiar={vi.fn()} />);

    expect(screen.getByText('No hay productos habilitados para seleccionar.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
