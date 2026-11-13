import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Chef } from '../types';

import { ChefsTabla } from './ChefsTabla';

const MARTA: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: '280 1',
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

const LUIS: Chef = {
  id: 5,
  dni: '40111222',
  nombre: 'Luis',
  apellido: 'Castro',
  telefono: null,
  estado: 'DESHABILITADO',
  correo: null,
};

describe('ChefsTabla', () => {
  it('muestra DNI, apellido y nombre, teléfono, correo y estado', () => {
    render(<ChefsTabla chefs={[MARTA, LUIS]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    const filas = screen.getAllByRole('row').slice(1);
    const celdas = filas.map((fila) =>
      within(fila)
        .getAllByRole('cell')
        .slice(0, 5)
        .map((celda) => celda.textContent),
    );

    expect(celdas).toEqual([
      ['28111222', 'Gómez, Marta', '280 1', 'marta@resto.com', 'Habilitado'],
      ['40111222', 'Castro, Luis', '—', 'Sin usuario', 'Deshabilitado'],
    ]);
  });

  it('con el listado vacío informa «No hay chefs disponibles»', () => {
    render(<ChefsTabla chefs={[]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('No hay chefs disponibles')).toBeInTheDocument();
  });

  it('ofrece «Editar» en cada chef y «Dar de baja» solo en los habilitados', () => {
    const onEditar = vi.fn();
    const onEliminar = vi.fn();
    render(<ChefsTabla chefs={[MARTA, LUIS]} onEditar={onEditar} onEliminar={onEliminar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar el chef 40111222' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja al chef 28111222' }));

    expect(onEditar).toHaveBeenCalledWith(LUIS);
    expect(onEliminar).toHaveBeenCalledWith(MARTA);
    expect(screen.queryByRole('button', { name: 'Dar de baja al chef 40111222' })).toBeNull();
  });

  it('muestra el error de carga y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <ChefsTabla
        chefs={[]}
        error="No tiene permiso para realizar esta acción"
        onReintentar={onReintentar}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    );

    expect(screen.getByText('No tiene permiso para realizar esta acción')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
