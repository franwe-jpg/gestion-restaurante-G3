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
    render(<SectoresTabla sectores={[SALON, RESERVADO]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('Salón principal')).toBeInTheDocument();
    expect(screen.getByText('Planta baja')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('muestra el nombre en mayúsculas sin cambiar el dato (CA 1 de #36)', () => {
    render(<SectoresTabla sectores={[SALON]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('Salón principal')).toHaveClass('uppercase');
  });

  it('muestra «—» cuando la descripción es nula (CA 1 de #36)', () => {
    render(<SectoresTabla sectores={[RESERVADO]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('entrega el sector al presionar «Editar «nombre»»', () => {
    const onEditar = vi.fn();
    render(
      <SectoresTabla sectores={[SALON, RESERVADO]} onEditar={onEditar} onEliminar={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Salón principal»' }));

    expect(onEditar).toHaveBeenCalledWith(SALON);
  });

  it('con el listado vacío informa «No hay sectores disponibles» (CA 2 de #36)', () => {
    render(<SectoresTabla sectores={[]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.getByText('No hay sectores disponibles')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('muestra el error de carga y permite reintentar', () => {
    const onReintentar = vi.fn();
    render(
      <SectoresTabla
        sectores={[]}
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

describe('SectoresTabla: baja', () => {
  it('entrega el sector al presionar «Eliminar «nombre»» (CA 1 de #35)', () => {
    const onEliminar = vi.fn();
    render(<SectoresTabla sectores={[SALON]} onEditar={vi.fn()} onEliminar={onEliminar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar «Salón principal»' }));

    expect(onEliminar).toHaveBeenCalledWith(SALON);
  });

  it('no ofrece eliminar un sector deshabilitado', () => {
    render(<SectoresTabla sectores={[RESERVADO]} onEditar={vi.fn()} onEliminar={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Eliminar «Reservado»' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar «Reservado»' })).toBeInTheDocument();
  });
});
