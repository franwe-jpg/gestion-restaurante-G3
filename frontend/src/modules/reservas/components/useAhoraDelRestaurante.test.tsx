import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INTERVALO_AHORA_MS, useAhoraDelRestaurante } from './useAhoraDelRestaurante';

const INICIO = new Date('2026-11-03T00:29:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(INICIO);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAhoraDelRestaurante', () => {
  it('el refresco es de un minuto', () => {
    expect(INTERVALO_AHORA_MS).toBe(60_000);
  });

  it('devuelve el instante actual al montarse', () => {
    const { result } = renderHook(() => useAhoraDelRestaurante());

    expect(result.current.getTime()).toBe(INICIO.getTime());
  });

  it('no cambia antes de cumplirse el minuto', () => {
    const { result } = renderHook(() => useAhoraDelRestaurante());

    act(() => {
      vi.advanceTimersByTime(INTERVALO_AHORA_MS - 1);
    });

    expect(result.current.getTime()).toBe(INICIO.getTime());
  });

  it('se refresca cada minuto con el reloj actual', () => {
    const { result } = renderHook(() => useAhoraDelRestaurante());

    act(() => {
      vi.advanceTimersByTime(INTERVALO_AHORA_MS);
    });
    expect(result.current.getTime()).toBe(INICIO.getTime() + INTERVALO_AHORA_MS);

    act(() => {
      vi.advanceTimersByTime(INTERVALO_AHORA_MS);
    });
    expect(result.current.getTime()).toBe(INICIO.getTime() + 2 * INTERVALO_AHORA_MS);
  });

  it('al desmontarse limpia el temporizador', () => {
    const { unmount } = renderHook(() => useAhoraDelRestaurante());
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
