import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavegadorFecha } from './NavegadorFecha';

function abrir(fecha = '2026-11-02') {
  const onCambiar = vi.fn();
  render(<NavegadorFecha fecha={fecha} onCambiar={onCambiar} />);
  return onCambiar;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NavegadorFecha', () => {
  it('muestra el día elegido en el campo «Día»', () => {
    abrir('2026-11-10');

    expect(screen.getByLabelText('Día')).toHaveValue('2026-11-10');
  });

  it.each([
    ['Día siguiente', '2026-11-02', '2026-11-03'],
    ['Día anterior', '2026-11-02', '2026-11-01'],
    ['Día siguiente', '2026-10-31', '2026-11-01'],
    ['Día siguiente', '2026-12-31', '2027-01-01'],
    ['Día anterior', '2026-03-01', '2026-02-28'],
  ])('«%s» desde %s lleva a %s', (boton, desde, hasta) => {
    const onCambiar = abrir(desde);

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith(hasta);
  });

  it('elegir un día en el campo lo informa', () => {
    const onCambiar = abrir();

    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-11-10' } });

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('2026-11-10');
  });

  it('vaciar el campo no pide ningún día', () => {
    const onCambiar = abrir();

    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '' } });

    expect(onCambiar).not.toHaveBeenCalled();
  });

  it('«Hoy» vuelve al día de hoy', () => {
    const onCambiar = abrir('2026-11-10');

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('2026-11-02');
  });

  it('«Hoy» a las 22:00 del 28/10 sigue siendo el 28, no el día UTC (S11)', () => {
    vi.setSystemTime(new Date(2026, 9, 28, 22, 0));
    const onCambiar = abrir('2026-11-10');

    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('2026-10-28');
  });
});
