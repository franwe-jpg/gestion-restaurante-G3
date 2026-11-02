import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Reserva } from '../types';

import { ReservasTabla } from './ReservasTabla';
import type { ReservasTablaProps } from './ReservasTabla';

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

/** La acción de modificar es obligatoria: los casos que no la usan reciben un manejador vacío. */
function mostrar(
  props: Omit<ReservasTablaProps, 'onModificar'> & Pick<Partial<ReservasTablaProps>, 'onModificar'>,
) {
  render(<ReservasTabla onModificar={vi.fn()} {...props} />);
}

describe('ReservasTabla: filas', () => {
  it('muestra los encabezados de las columnas', () => {
    mostrar({ reservas: [ACTIVA] });

    const encabezados = screen.getAllByRole('columnheader').map((celda) => celda.textContent);
    expect(encabezados).toEqual(['Hora', 'Cliente', 'Personas', 'Mesa', 'Estado', 'Acciones']);
  });

  it('muestra hora, cliente, personas, mesa y estado de cada reserva', () => {
    mostrar({ reservas: [ACTIVA, { ...ACTIVA, id: 2, hora: '13:00' }] });

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
    mostrar({ reservas: UNA_POR_ESTADO });

    expect(screen.getByText('Activa')).toHaveClass('bg-info-subtle');
    expect(screen.getByText('Atendida')).toHaveClass('bg-success-subtle');
    expect(screen.getByText('Cancelada anticipada')).toHaveClass('bg-slate-100');
    expect(screen.getByText('Cancelada por ausencia')).toHaveClass('bg-danger-subtle');
    expect(screen.queryByText('CANCELADA_POR_AUSENCIA')).toBeNull();
  });
});

describe('ReservasTabla: vacío, carga y error', () => {
  it('sin reservas muestra el mensaje de filtros sin resultados', () => {
    mostrar({ reservas: [] });

    expect(screen.getByText('No hay reservas para los filtros elegidos.')).toBeInTheDocument();
  });

  it('mientras carga no muestra el mensaje de vacío ni las reservas', () => {
    mostrar({ reservas: [ACTIVA], cargando: true });

    expect(screen.queryByText('No hay reservas para los filtros elegidos.')).toBeNull();
    expect(screen.queryByText('Cliente n.º 7')).toBeNull();
  });

  it('ante un error muestra el mensaje fijo y reintenta con la acción', () => {
    const onReintentar = vi.fn();
    mostrar({ reservas: [], error: 'Falló el servidor', onReintentar });

    expect(screen.getByText('No se pudieron cargar las reservas.')).toBeInTheDocument();
    expect(screen.queryByText('Falló el servidor')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('ReservasTabla: acción «Modificar reserva»', () => {
  it('se ofrece solo en las filas ACTIVA', () => {
    mostrar({ reservas: UNA_POR_ESTADO });

    const botones = screen.getAllByRole('button', { name: 'Modificar reserva' });
    expect(botones).toHaveLength(1);
    const filas = screen.getAllByRole('row');
    expect(within(filas[1]!).getByRole('button', { name: 'Modificar reserva' })).toBe(botones[0]);
    for (const fila of filas.slice(2)) {
      expect(within(fila).queryByRole('button', { name: 'Modificar reserva' })).toBeNull();
    }
  });

  it('al pulsarla avisa con la reserva de esa fila', () => {
    const otra: Reserva = { ...ACTIVA, id: 2, hora: '22:00', cantidad_personas: 2 };
    const onModificar = vi.fn();
    mostrar({ reservas: [ACTIVA, otra], onModificar });

    const segunda = within(screen.getAllByRole('row')[2]!);
    fireEvent.click(segunda.getByRole('button', { name: 'Modificar reserva' }));

    expect(onModificar).toHaveBeenCalledExactlyOnceWith(otra);
  });
});
