import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Mozo } from '../types';

import { MozosTabla } from './MozosTabla';

const JUAN: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  estado: 'HABILITADO',
  correo: 'juan@resto.com',
};

const ANA: Mozo = {
  id: 2,
  dni: '35987654',
  nombre: 'Ana',
  apellido: 'Romero',
  telefono: null,
  estado: 'HABILITADO',
  correo: null,
};

const LUIS: Mozo = {
  id: 3,
  dni: '40111222',
  nombre: 'Luis',
  apellido: 'Castro',
  telefono: null,
  estado: 'DESHABILITADO',
  correo: 'luis@resto.com',
};

describe('MozosTabla: datos', () => {
  it('muestra DNI, apellido y nombre, teléfono, correo y estado (CA 1 y 3 de #46)', () => {
    render(<MozosTabla mozos={[JUAN, ANA, LUIS]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    const filas = screen.getAllByRole('row').slice(1);
    const celdas = filas.map((fila) =>
      within(fila)
        .getAllByRole('cell')
        .slice(0, 5)
        .map((celda) => celda.textContent),
    );

    expect(celdas).toEqual([
      ['30123456', 'Fernández, Juan', '280 412-3456', 'juan@resto.com', 'Habilitado'],
      ['35987654', 'Romero, Ana', '—', 'Sin usuario', 'Habilitado'],
      ['40111222', 'Castro, Luis', '—', 'luis@resto.com', 'Deshabilitado'],
    ]);
  });

  it('con el listado vacío informa «No hay mozos disponibles» (CA 2 de #46)', () => {
    render(<MozosTabla mozos={[]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('No hay mozos disponibles')).toBeInTheDocument();
  });

  it('muestra el error de carga y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <MozosTabla
        mozos={[]}
        error="No se pudo conectar con el backend"
        onReintentar={onReintentar}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    );

    expect(screen.getByText('No se pudo conectar con el backend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('MozosTabla: acciones', () => {
  it('ofrece «Dar de baja» solo en los mozos habilitados (CA 3 de #45)', () => {
    const onEliminar = vi.fn();
    render(<MozosTabla mozos={[JUAN, LUIS]} onEditar={vi.fn()} onEliminar={onEliminar} />);

    expect(screen.queryByRole('button', { name: 'Dar de baja al mozo 40111222' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja al mozo 30123456' }));

    expect(onEliminar).toHaveBeenCalledWith(JUAN);
  });

  it('ofrece «Editar» en cada mozo y entrega la fila (CA 1 de #44)', () => {
    const onEditar = vi.fn();
    render(<MozosTabla mozos={[JUAN, ANA]} onEditar={onEditar} onEliminar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar el mozo 35987654' }));

    expect(onEditar).toHaveBeenCalledWith(ANA);
  });
});
