import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteReservasAusentismoPdf, obtenerReporteReservasAusentismo } from '../api';
import type { ResumenReservas } from '../types';

import {
  ERROR_CARGA,
  ERROR_DESCARGA,
  useReporteReservasAusentismo,
} from './useReporteReservasAusentismo';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

function resumen(datos: Partial<ResumenReservas> = {}): ResumenReservas {
  return {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-31',
    total_reservas: 6,
    atendidas: 1,
    canceladas_anticipada: 2,
    canceladas_por_ausencia: 1,
    porcentaje_ausentismo: '16.67',
    ...datos,
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('useReporteReservasAusentismo: validación local y éxito', () => {
  it('inicializa el período con el primer día del mes y hoy', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    try {
      const { result } = renderHook(() => useReporteReservasAusentismo());

      expect(result.current.desde).toBe('2026-11-01');
      expect(result.current.hasta).toBe('2026-11-13');
    } finally {
      vi.useRealTimers();
    }
  });

  it('con validación local inválida (falta hasta) no llama a la API y expone el error', async () => {
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('');
    });

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe('Falta la fecha hasta.');
    expect(obtenerReporteReservasAusentismo).not.toHaveBeenCalled();
  });

  it('con éxito expone el resultado de la API', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: resumen(),
      exito: true,
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('2026-10-31');
    });

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.resultado).toEqual(resumen());
    expect(result.current.error).toBeNull();
  });
});

describe('useReporteReservasAusentismo: errores de la API al generar', () => {
  it('con un 422 muestra el detalle de la respuesta', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-31');
      result.current.setHasta('2026-10-01');
    });
    act(() => result.current.setDesde('2026-10-01'));
    act(() => result.current.setHasta('2026-10-31'));

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe(
      'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    );
  });

  it('sin detalle en la respuesta usa ERROR_CARGA', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: null,
      exito: false,
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('2026-10-31');
    });

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe(ERROR_CARGA);
  });
});

describe('useReporteReservasAusentismo: descargarPdf', () => {
  it('descargarPdf llama a guardarArchivo con el período del resultado, no del formulario', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: resumen(),
      exito: true,
    });
    const blob = new Blob(['%PDF']);
    vi.mocked(descargarReporteReservasAusentismoPdf).mockResolvedValue({
      datos: blob,
      exito: true,
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('2026-10-31');
    });
    await act(async () => {
      await result.current.generar();
    });
    act(() => {
      result.current.setDesde('2026-11-01');
      result.current.setHasta('2026-11-30');
    });

    await act(async () => {
      await result.current.descargarPdf();
    });

    expect(descargarReporteReservasAusentismoPdf).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    await waitFor(() => {
      expect(guardarArchivo).toHaveBeenCalledWith(
        blob,
        'reservas-ausentismo_2026-10-01_2026-10-31.pdf',
      );
    });
  });
});

describe('useReporteReservasAusentismo: errores de descargarPdf', () => {
  it('un error de descarga expone errorDescarga con el detalle', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: resumen(),
      exito: true,
    });
    vi.mocked(descargarReporteReservasAusentismoPdf).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'x',
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('2026-10-31');
    });
    await act(async () => {
      await result.current.generar();
    });

    await act(async () => {
      await result.current.descargarPdf();
    });

    expect(result.current.errorDescarga).toBe('x');
  });

  it('un error de descarga sin detalle usa ERROR_DESCARGA', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: resumen(),
      exito: true,
    });
    vi.mocked(descargarReporteReservasAusentismoPdf).mockResolvedValue({
      datos: null,
      exito: false,
    });
    const { result } = renderHook(() => useReporteReservasAusentismo());
    act(() => {
      result.current.setDesde('2026-10-01');
      result.current.setHasta('2026-10-31');
    });
    await act(async () => {
      await result.current.generar();
    });

    await act(async () => {
      await result.current.descargarPdf();
    });

    expect(result.current.errorDescarga).toBe(ERROR_DESCARGA);
  });
});
