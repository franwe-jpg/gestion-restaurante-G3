import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Sector } from '../types';

import { FiltrosDeMesas } from './FiltrosDeMesas';

const SECTORES: Sector[] = [
  { id: 1, nombre: 'Salón principal', descripcion: null, estado: 'HABILITADO' },
  { id: 2, nombre: 'Terraza', descripcion: null, estado: 'HABILITADO' },
];

function renderFiltros(sectorId = 'TODOS', estado: 'TODOS' | 'LIBRE' = 'TODOS') {
  const onCambiarSector = vi.fn();
  const onCambiarEstado = vi.fn();
  const onLimpiar = vi.fn();
  render(
    <FiltrosDeMesas
      sectores={SECTORES}
      sectorId={sectorId}
      estado={estado}
      visibles={2}
      total={3}
      onCambiarSector={onCambiarSector}
      onCambiarEstado={onCambiarEstado}
      onLimpiar={onLimpiar}
    />,
  );
  return { onCambiarSector, onCambiarEstado, onLimpiar };
}

describe('FiltrosDeMesas: filtros funcionales', () => {
  it('cambia el sector y el estado con los selectores', () => {
    const { onCambiarSector, onCambiarEstado } = renderFiltros();

    fireEvent.change(screen.getByLabelText('Filtrar por sector'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'LIBRE' } });

    expect(onCambiarSector).toHaveBeenCalledWith('2');
    expect(onCambiarEstado).toHaveBeenCalledWith('LIBRE');
  });

  it('informa cuántas mesas pasan el filtro y permite limpiarlo', () => {
    const { onLimpiar } = renderFiltros('2', 'LIBRE');

    expect(screen.getByText('2 de 3 mesas de esta página')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });
});
