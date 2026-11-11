import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteRecaudacionPdf, obtenerReporteRecaudacion } from '../api';
import type { ResumenRecaudacion } from '../types';

import { ERROR_CARGA, ERROR_DESCARGA, useReporteRecaudacion } from './useReporteRecaudacion';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

const RESUMEN: ResumenRecaudacion = {
  fecha_desde: '2026-10-01',
  fecha_hasta: '2026-10-31',
  por_medio_pago: [],
  total_cobrado: '0.00',
  adeudado: { cantidad_facturas: 0, monto: '0.00' },
};

afterEach(() => {
  vi.resetAllMocks();
});

function conPeriodo() {
  const hook = renderHook(() => useReporteRecaudacion());
  act(() => {
    hook.result.current.setDesde('2026-10-01');
    hook.result.current.setHasta('2026-10-31');
  });
  return hook;
}

describe('useReporteRecaudacion: generar', () => {
  it('con validación local inválida no llama a la API y expone el error', async () => {
    const { result } = renderHook(() => useReporteRecaudacion());
    act(() => result.current.setDesde('2026-10-01'));

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe('Falta la fecha hasta.');
    expect(obtenerReporteRecaudacion).not.toHaveBeenCalled();
  });

  it('con éxito expone el resultado de la API', async () => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({ datos: RESUMEN, exito: true });
    const { result } = conPeriodo();

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.resultado).toEqual(RESUMEN);
    expect(result.current.error).toBeNull();
  });

  it('con un 422 expone el detalle de la respuesta', async () => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    });
    const { result } = conPeriodo();

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe(
      'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    );
  });

  it('sin detalle en la respuesta usa ERROR_CARGA', async () => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({ datos: null, exito: false });
    const { result } = conPeriodo();

    await act(async () => {
      await result.current.generar();
    });

    expect(result.current.error).toBe(ERROR_CARGA);
  });
});

describe('useReporteRecaudacion: descargarPdf', () => {
  it('guarda el archivo con el período del resultado, no el del formulario', async () => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({ datos: RESUMEN, exito: true });
    const blob = new Blob(['%PDF']);
    vi.mocked(descargarReporteRecaudacionPdf).mockResolvedValue({ datos: blob, exito: true });
    const { result } = conPeriodo();
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

    expect(descargarReporteRecaudacionPdf).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
    await waitFor(() => {
      expect(guardarArchivo).toHaveBeenCalledWith(
        blob,
        'recaudacion-medio-pago_2026-10-01_2026-10-31.pdf',
      );
    });
  });

  it.each([
    ['con el detalle', 'x', 'x'],
    ['sin detalle usa ERROR_DESCARGA', undefined, ERROR_DESCARGA],
  ])('un error de descarga %s y conserva el resultado', async (_caso, error, esperado) => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({ datos: RESUMEN, exito: true });
    vi.mocked(descargarReporteRecaudacionPdf).mockResolvedValue({
      datos: null,
      exito: false,
      error,
    });
    const { result } = conPeriodo();
    await act(async () => {
      await result.current.generar();
    });

    await act(async () => {
      await result.current.descargarPdf();
    });

    expect(result.current.errorDescarga).toBe(esperado);
    expect(result.current.resultado).toEqual(RESUMEN);
    expect(guardarArchivo).not.toHaveBeenCalled();
  });
});
