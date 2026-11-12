import { describe, expect, it } from 'vitest';

import { MOTIVO_OTRO_DIA, atencionDeReserva } from './atencionDeReserva';

/** 21:30 del 2 de noviembre en el restaurante (UTC-3) son las 00:30 UTC del día siguiente. */
const RESERVA = { fecha: '2026-11-02', hora: '21:30' };
const A_LAS_2130 = '2026-11-03T00:30:00Z';

function atender(reserva: { fecha: string; hora: string }, instanteUtc: string) {
  return atencionDeReserva(reserva, new Date(instanteUtc));
}

describe('atencionDeReserva: el día de la reserva', () => {
  it('con la hora ya cumplida se puede atender', () => {
    expect(atender(RESERVA, '2026-11-03T02:30:00Z')).toEqual({ disponible: true });
  });

  it('exactamente a la hora de la reserva se puede atender', () => {
    expect(atender(RESERVA, A_LAS_2130)).toEqual({ disponible: true });
  });

  it('con segundos después de la hora se puede atender', () => {
    expect(atender(RESERVA, '2026-11-03T00:30:59Z')).toEqual({ disponible: true });
  });

  it('un minuto antes no se puede atender y el motivo dice desde qué hora', () => {
    expect(atender(RESERVA, '2026-11-03T00:29:00Z')).toEqual({
      disponible: false,
      motivo: 'Disponible desde las 21:30',
    });
  });

  it('segundos antes de la hora tampoco se puede atender', () => {
    expect(atender(RESERVA, '2026-11-03T00:29:59Z')).toEqual({
      disponible: false,
      motivo: 'Disponible desde las 21:30',
    });
  });
});

describe('atencionDeReserva: otro día', () => {
  it('una reserva de un día pasado no se puede atender', () => {
    expect(atender({ ...RESERVA, fecha: '2026-11-01' }, A_LAS_2130)).toEqual({
      disponible: false,
      motivo: MOTIVO_OTRO_DIA,
    });
  });

  it('una reserva de un día futuro no se puede atender', () => {
    expect(atender({ ...RESERVA, fecha: '2026-11-03' }, A_LAS_2130)).toEqual({
      disponible: false,
      motivo: MOTIVO_OTRO_DIA,
    });
  });

  it('el texto del motivo es el de la HU, en español neutro', () => {
    expect(MOTIVO_OTRO_DIA).toBe('Solo se puede crear la comanda el día de la reserva');
  });
});

describe('atencionDeReserva: cruce de medianoche en la hora del restaurante', () => {
  it('02:30 UTC del día siguiente sigue siendo el día anterior en el restaurante', () => {
    const instante = '2026-11-03T02:30:00Z';

    expect(atender({ fecha: '2026-11-02', hora: '23:00' }, instante)).toEqual({ disponible: true });
    expect(atender({ fecha: '2026-11-03', hora: '00:00' }, instante)).toEqual({
      disponible: false,
      motivo: MOTIVO_OTRO_DIA,
    });
  });

  it('a las 03:00 UTC empieza el día del restaurante', () => {
    const reserva = { fecha: '2026-11-03', hora: '00:00' };

    expect(atender(reserva, '2026-11-03T02:59:59Z').disponible).toBe(false);
    expect(atender(reserva, '2026-11-03T03:00:00Z')).toEqual({ disponible: true });
  });

  it('el día cambia también al pasar de mes y de año', () => {
    const reserva = { fecha: '2026-12-31', hora: '23:59' };

    expect(atender(reserva, '2027-01-01T02:58:59Z')).toEqual({
      disponible: false,
      motivo: 'Disponible desde las 23:59',
    });
    expect(atender(reserva, '2027-01-01T02:59:00Z')).toEqual({ disponible: true });
    expect(atender(reserva, '2027-01-01T03:00:00Z')).toEqual({
      disponible: false,
      motivo: MOTIVO_OTRO_DIA,
    });
  });
});
