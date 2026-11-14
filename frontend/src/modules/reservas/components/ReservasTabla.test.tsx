import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

/**
 * 23:30 del 2 de noviembre en el restaurante (UTC-3): ya pasó la hora de `ACTIVA` (21:30) y de las
 * demás filas de las pruebas, así que «Crear comanda» se ofrece habilitada (HU-M5-06).
 */
const EN_HORARIO = '2026-11-03T02:30:00Z';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(EN_HORARIO));
});

afterEach(() => {
  vi.useRealTimers();
});

const UNA_POR_ESTADO: Reserva[] = [
  ACTIVA,
  { ...ACTIVA, id: 2, hora: '13:00', estado: 'ATENDIDA' },
  { ...ACTIVA, id: 3, hora: '13:30', estado: 'CANCELADA_ANTICIPADA' },
  { ...ACTIVA, id: 4, hora: '22:00', estado: 'CANCELADA_POR_AUSENCIA' },
];

type PropsObligatorias =
  'onCrearComanda' | 'onModificar' | 'onCancelarAnticipada' | 'onCancelarPorAusencia';

/** Las cuatro acciones son obligatorias: los casos que no las usan reciben un manejador vacío. */
function mostrar(
  props: Omit<ReservasTablaProps, PropsObligatorias> &
    Pick<Partial<ReservasTablaProps>, PropsObligatorias>,
) {
  render(
    <ReservasTabla
      onCrearComanda={vi.fn()}
      onModificar={vi.fn()}
      onCancelarAnticipada={vi.fn()}
      onCancelarPorAusencia={vi.fn()}
      {...props}
    />,
  );
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

describe('ReservasTabla: acciones «Cancelar reserva» y «Cancelar por ausencia» (HU-M5-04-05)', () => {
  it('se ofrecen solo en las filas ACTIVA', () => {
    mostrar({ reservas: UNA_POR_ESTADO });

    const filas = screen.getAllByRole('row');
    const activa = within(filas[1]!);
    expect(activa.getByRole('button', { name: 'Crear comanda' })).toBeInTheDocument();
    expect(activa.getByRole('button', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(activa.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument();
    expect(activa.getByRole('button', { name: 'Cancelar por ausencia' })).toBeInTheDocument();
    for (const fila of filas.slice(2)) {
      expect(within(fila).queryByRole('button', { name: 'Crear comanda' })).toBeNull();
      expect(within(fila).queryByRole('button', { name: 'Modificar reserva' })).toBeNull();
      expect(within(fila).queryByRole('button', { name: 'Cancelar reserva' })).toBeNull();
      expect(within(fila).queryByRole('button', { name: 'Cancelar por ausencia' })).toBeNull();
    }
  });

  it('al pulsar «Cancelar reserva» avisa con la reserva de esa fila', () => {
    const otra: Reserva = { ...ACTIVA, id: 2, hora: '22:00', cantidad_personas: 2 };
    const onCancelarAnticipada = vi.fn();
    mostrar({ reservas: [ACTIVA, otra], onCancelarAnticipada });

    const segunda = within(screen.getAllByRole('row')[2]!);
    fireEvent.click(segunda.getByRole('button', { name: 'Cancelar reserva' }));

    expect(onCancelarAnticipada).toHaveBeenCalledExactlyOnceWith(otra);
  });

  it('al pulsar «Cancelar por ausencia» avisa con la reserva de esa fila', () => {
    const otra: Reserva = { ...ACTIVA, id: 2, hora: '22:00', cantidad_personas: 2 };
    const onCancelarPorAusencia = vi.fn();
    mostrar({ reservas: [ACTIVA, otra], onCancelarPorAusencia });

    const segunda = within(screen.getAllByRole('row')[2]!);
    fireEvent.click(segunda.getByRole('button', { name: 'Cancelar por ausencia' }));

    expect(onCancelarPorAusencia).toHaveBeenCalledExactlyOnceWith(otra);
  });
});

describe('ReservasTabla: acción «Crear comanda» (HU-M5-06)', () => {
  it('se ofrece solo en las filas ACTIVA y es la primera acción de la fila', () => {
    mostrar({ reservas: UNA_POR_ESTADO });

    expect(screen.getAllByRole('button', { name: 'Crear comanda' })).toHaveLength(1);
    const filas = screen.getAllByRole('row');
    const acciones = within(filas[1]!)
      .getAllByRole('button')
      .map((boton) => boton.getAttribute('aria-label'));
    expect(acciones).toEqual([
      'Crear comanda',
      'Modificar reserva',
      'Cancelar reserva',
      'Cancelar por ausencia',
    ]);
    for (const fila of filas.slice(2)) {
      expect(within(fila).queryByRole('button', { name: 'Crear comanda' })).toBeNull();
    }
  });

  it('al pulsarla avisa con la reserva de esa fila', () => {
    const otra: Reserva = { ...ACTIVA, id: 2, hora: '22:00', cantidad_personas: 2 };
    const onCrearComanda = vi.fn();
    mostrar({ reservas: [ACTIVA, otra], onCrearComanda });

    const segunda = within(screen.getAllByRole('row')[2]!);
    fireEvent.click(segunda.getByRole('button', { name: 'Crear comanda' }));

    expect(onCrearComanda).toHaveBeenCalledExactlyOnceWith(otra);
  });
});

function botonCrearComanda() {
  return screen.getByRole('button', { name: 'Crear comanda' });
}

describe('ReservasTabla: «Crear comanda» habilitada (HU-M5-06)', () => {
  it('con la reserva de hoy y la hora cumplida está habilitada y sin motivo', () => {
    mostrar({ reservas: [ACTIVA] });

    const boton = botonCrearComanda();
    expect(boton).toBeEnabled();
    expect(boton).not.toHaveAttribute('title');
    expect(boton).not.toHaveAttribute('aria-describedby');
  });

  it('exactamente a la hora de la reserva está habilitada', () => {
    vi.setSystemTime(new Date('2026-11-03T00:30:00Z'));
    mostrar({ reservas: [ACTIVA] });

    expect(botonCrearComanda()).toBeEnabled();
  });
});

describe('ReservasTabla: «Crear comanda» deshabilitada (HU-M5-06)', () => {
  it('un minuto antes de la hora queda deshabilitada y dice desde cuándo', () => {
    vi.setSystemTime(new Date('2026-11-03T00:29:00Z'));
    mostrar({ reservas: [ACTIVA] });

    const boton = botonCrearComanda();
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('title', 'Disponible desde las 21:30');
    expect(boton).toHaveAccessibleDescription('Disponible desde las 21:30');
  });

  it('el motivo también está en el contenedor del botón: deshabilitado no recibe el puntero', () => {
    vi.setSystemTime(new Date('2026-11-03T00:29:00Z'));
    mostrar({ reservas: [ACTIVA] });

    expect(botonCrearComanda().parentElement).toHaveAttribute(
      'title',
      'Disponible desde las 21:30',
    );
  });

  it('una reserva de un día pasado queda deshabilitada con el motivo del día', () => {
    mostrar({ reservas: [{ ...ACTIVA, fecha: '2026-11-01' }] });

    const boton = botonCrearComanda();
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('title', 'Solo se puede crear la comanda el día de la reserva');
    expect(boton).toHaveAccessibleDescription(
      'Solo se puede crear la comanda el día de la reserva',
    );
  });

  it('una reserva de un día futuro queda deshabilitada con el motivo del día', () => {
    mostrar({ reservas: [{ ...ACTIVA, fecha: '2026-11-03' }] });

    expect(botonCrearComanda()).toBeDisabled();
    expect(botonCrearComanda()).toHaveAttribute(
      'title',
      'Solo se puede crear la comanda el día de la reserva',
    );
  });
});

describe('ReservasTabla: «Crear comanda» deshabilitada en varias filas (HU-M5-06)', () => {
  it('02:30 UTC del día siguiente es todavía el día anterior en el restaurante', () => {
    mostrar({
      reservas: [
        { ...ACTIVA, id: 1, fecha: '2026-11-02', hora: '23:00' },
        { ...ACTIVA, id: 2, fecha: '2026-11-03', hora: '00:00' },
      ],
    });

    const botones = screen.getAllByRole('button', { name: 'Crear comanda' });
    expect(botones[0]).toBeEnabled();
    expect(botones[1]).toBeDisabled();
  });

  it('al pulsarla deshabilitada no avisa', () => {
    const onCrearComanda = vi.fn();
    mostrar({ reservas: [{ ...ACTIVA, fecha: '2026-11-01' }], onCrearComanda });

    fireEvent.click(botonCrearComanda());

    expect(onCrearComanda).not.toHaveBeenCalled();
  });

  it('cada fila lleva el motivo de su propia reserva', () => {
    mostrar({
      reservas: [
        { ...ACTIVA, id: 1, hora: '23:45' },
        { ...ACTIVA, id: 2, hora: '23:50' },
      ],
    });

    const filas = screen.getAllByRole('row');
    const primera = within(filas[1]!).getByRole('button', { name: 'Crear comanda' });
    const segunda = within(filas[2]!).getByRole('button', { name: 'Crear comanda' });
    expect(primera).toHaveAccessibleDescription('Disponible desde las 23:45');
    expect(segunda).toHaveAccessibleDescription('Disponible desde las 23:50');
  });

  it('las reservas que no son ACTIVA siguen sin ofrecerla', () => {
    vi.setSystemTime(new Date('2026-11-03T00:29:00Z'));
    mostrar({ reservas: UNA_POR_ESTADO.slice(1) });

    expect(screen.queryByRole('button', { name: 'Crear comanda' })).toBeNull();
  });
});

describe('ReservasTabla: «Crear comanda» al llegar la hora (HU-M5-06)', () => {
  it('se habilita sola cuando el reloj avanza hasta la hora, sin recargar', () => {
    vi.setSystemTime(new Date('2026-11-03T00:29:00Z'));
    mostrar({ reservas: [ACTIVA] });
    expect(botonCrearComanda()).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(botonCrearComanda()).toBeEnabled();
    expect(botonCrearComanda()).not.toHaveAttribute('title');
  });

  it('se deshabilita sola cuando el reloj pasa a otro día', () => {
    vi.setSystemTime(new Date('2026-11-03T02:59:00Z'));
    mostrar({ reservas: [ACTIVA] });
    expect(botonCrearComanda()).toBeEnabled();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(botonCrearComanda()).toBeDisabled();
  });
});
