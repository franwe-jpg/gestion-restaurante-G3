import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Mesa } from '../types';

import { MesasTabla } from './MesasTabla';

const SALON_1: Mesa = {
  id: 1,
  numero: 1,
  capacidad: 2,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

const SALON_2: Mesa = {
  id: 2,
  numero: 2,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'OCUPADA',
};

const TERRAZA_1: Mesa = {
  id: 3,
  numero: 1,
  capacidad: 6,
  sector: { id: 2, nombre: 'Terraza' },
  estado: 'FUERA_DE_SERVICIO',
};

describe('MesasTabla', () => {
  it('muestra número, sector, capacidad y estado de cada mesa (CA 1 de #41)', () => {
    render(<MesasTabla mesas={[SALON_1, SALON_2, TERRAZA_1]} />);

    const filas = screen.getAllByRole('row').slice(1);
    const celdas = filas.map((fila) =>
      within(fila)
        .getAllByRole('cell')
        .map((celda) => celda.textContent),
    );

    expect(celdas).toEqual([
      ['1', 'Salón principal', '2', 'Libre'],
      ['2', 'Salón principal', '4', 'Ocupada'],
      ['1', 'Terraza', '6', 'Fuera de servicio'],
    ]);
  });

  it('muestra el sector de cada mesa (CA 3 de #41)', () => {
    render(<MesasTabla mesas={[SALON_1, TERRAZA_1]} />);

    const filas = screen.getAllByRole('row').slice(1);

    expect(filas.map((fila) => fila.textContent)).toEqual([
      expect.stringContaining('Salón principal'),
      expect.stringContaining('Terraza'),
    ]);
  });

  it('con el listado vacío informa «No hay mesas disponibles» (CA 2 de #41)', () => {
    render(<MesasTabla mesas={[]} />);

    expect(screen.getByText('No hay mesas disponibles')).toBeInTheDocument();
  });

  it('muestra el error de carga y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <MesasTabla
        mesas={[]}
        error="No se pudo conectar con el backend"
        onReintentar={onReintentar}
      />,
    );

    expect(screen.getByText('No se pudo conectar con el backend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
