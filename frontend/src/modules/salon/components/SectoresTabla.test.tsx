import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Sector } from '../types';

import { SectoresTabla } from './SectoresTabla';

const SALON: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: 'Planta baja',
  estado: 'HABILITADO',
};

const RESERVADO: Sector = {
  id: 2,
  nombre: 'Reservado',
  descripcion: null,
  estado: 'DESHABILITADO',
};

describe('SectoresTabla', () => {
  it('muestra nombre, descripción y estado de cada sector (CA 1 de #36)', () => {
    render(<SectoresTabla sectores={[SALON, RESERVADO]} onEditar={vi.fn()} />);

    expect(screen.getByText('Salón principal')).toBeInTheDocument();
    expect(screen.getByText('Planta baja')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('muestra «—» cuando la descripción es nula (CA 1 de #36)', () => {
    render(<SectoresTabla sectores={[RESERVADO]} onEditar={vi.fn()} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('entrega el sector al presionar «Editar «nombre»»', () => {
    const onEditar = vi.fn();
    render(<SectoresTabla sectores={[SALON, RESERVADO]} onEditar={onEditar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Salón principal»' }));

    expect(onEditar).toHaveBeenCalledWith(SALON);
  });

  it('con el listado vacío informa «No hay sectores disponibles» (CA 2 de #36)', () => {
    render(<SectoresTabla sectores={[]} onEditar={vi.fn()} />);

    expect(screen.getByText('No hay sectores disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
  });

  it('muestra el error de carga y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <SectoresTabla
        sectores={[]}
        error="No se pudo conectar con el backend"
        onReintentar={onReintentar}
        onEditar={vi.fn()}
      />,
    );

    expect(screen.getByText('No se pudo conectar con el backend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
