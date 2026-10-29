import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Reserva } from '../types';

import { ReservasTabla } from './ReservasTabla';

const ACTIVA: Reserva = {
  id: 1,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-02',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

const UNA_POR_ESTADO: Reserva[] = [
  ACTIVA,
  { ...ACTIVA, id: 2, hora: '13:00', estado: 'ATENDIDA' },
  { ...ACTIVA, id: 3, hora: '13:30', estado: 'CANCELADA_ANTICIPADA' },
  { ...ACTIVA, id: 4, hora: '22:00', estado: 'CANCELADA_POR_AUSENCIA' },
];

describe('ReservasTabla: filas', () => {
  it('muestra los encabezados de las columnas', () => {
    render(<ReservasTabla reservas={[ACTIVA]} />);

    const encabezados = screen.getAllByRole('columnheader').map((celda) => celda.textContent);
    expect(encabezados).toEqual(['Hora', 'Cliente', 'Personas', 'Mesa', 'Estado']);
  });

  it('muestra hora, cliente, personas, mesa y estado de cada reserva', () => {
    render(<ReservasTabla reservas={[ACTIVA, { ...ACTIVA, id: 2, hora: '13:00' }]} />);

    const filas = screen.getAllByRole('row');
    expect(filas).toHaveLength(3);
    const primera = within(filas[1]!);
    expect(primera.getByText('21:30')).toBeInTheDocument();
    expect(primera.getByText('Cliente n.º 7')).toBeInTheDocument();
    expect(primera.getByText('4')).toBeInTheDocument();
    expect(primera.getByText('Mesa n.º 5')).toBeInTheDocument();
    expect(primera.getByText('Activa')).toBeInTheDocument();
    expect(within(filas[2]!).getByText('13:00')).toBeInTheDocument();
  });

  it('da a cada estado su texto legible y su variante de la maqueta (S12)', () => {
    render(<ReservasTabla reservas={UNA_POR_ESTADO} />);

    expect(screen.getByText('Activa')).toHaveClass('bg-info-subtle');
    expect(screen.getByText('Atendida')).toHaveClass('bg-success-subtle');
    expect(screen.getByText('Cancelada anticipada')).toHaveClass('bg-slate-100');
    expect(screen.getByText('Cancelada por ausencia')).toHaveClass('bg-danger-subtle');
    expect(screen.queryByText('CANCELADA_POR_AUSENCIA')).toBeNull();
  });
});

describe('ReservasTabla: vacío, carga y error', () => {
  it('sin reservas muestra el mensaje de filtros sin resultados', () => {
    render(<ReservasTabla reservas={[]} />);

    expect(screen.getByText('No hay reservas para los filtros elegidos.')).toBeInTheDocument();
  });

  it('mientras carga no muestra el mensaje de vacío ni las reservas', () => {
    render(<ReservasTabla reservas={[ACTIVA]} cargando />);

    expect(screen.queryByText('No hay reservas para los filtros elegidos.')).toBeNull();
    expect(screen.queryByText('Cliente n.º 7')).toBeNull();
  });

  it('ante un error muestra el mensaje fijo y reintenta con la acción', () => {
    const onReintentar = vi.fn();
    render(<ReservasTabla reservas={[]} error="Falló el servidor" onReintentar={onReintentar} />);

    expect(screen.getByText('No se pudieron cargar las reservas.')).toBeInTheDocument();
    expect(screen.queryByText('Falló el servidor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
