import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Reserva } from '../types';

import { ReservasTabla } from './ReservasTabla';
import type { ReservasTablaProps } from './ReservasTabla';

const ACTIVA: Reserva = {
  id: 1,
  cliente_nombre: 'Ana Pérez',
  cliente_telefono: '2804000000',
  fecha: '2026-12-01',
  hora: '21:00:00',
  cantidad_personas: 4,
  mesa: { id: 2, numero: 5, capacidad: 4, sector_nombre: 'Terraza' },
  estado: 'ACTIVA',
};

const CANCELADA: Reserva = {
  ...ACTIVA,
  id: 2,
  cliente_nombre: 'Luis Gómez',
  estado: 'CANCELADA_POR_AUSENCIA',
};

function mostrar(propiedades: Partial<ReservasTablaProps> = {}) {
  return render(<ReservasTabla reservas={[]} onEditar={() => {}} {...propiedades} />);
}

describe('ReservasTabla', () => {
  it('muestra hora, cliente, teléfono, personas, mesa y estado (HU-M5-03)', () => {
    mostrar({ reservas: [ACTIVA] });

    expect(screen.getByText('09:00 p. m.')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('2804000000')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Terraza · 5')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('muestra una insignia distinta por cada estado', () => {
    mostrar({ reservas: [ACTIVA, CANCELADA] });

    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Cancelada por ausencia')).toBeInTheDocument();
  });

  it('sin reservas muestra el vacío del día', () => {
    mostrar();

    expect(screen.getByText('No hay reservas para este día')).toBeInTheDocument();
    expect(screen.getByRole('table').querySelector('tbody')).toBeEmptyDOMElement();
  });

  it('muestra el error con la opción de reintentar', () => {
    const onReintentar = vi.fn();
    mostrar({ error: 'Falló la carga', onReintentar });

    expect(screen.getByText('Falló la carga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('el botón editar llama a onEditar con la reserva de esa fila', () => {
    const onEditar = vi.fn();
    mostrar({ reservas: [ACTIVA], onEditar });

    fireEvent.click(screen.getByRole('button', { name: /Editar la reserva de Ana Pérez/ }));

    expect(onEditar).toHaveBeenCalledWith(ACTIVA);
  });
});
