import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listarPromociones, obtenerReporteImpactoPromociones } from '../api';
import type { Promocion, ReporteImpactoPromociones } from '../types';

import { ReporteImpactoPromocionesPage } from './ReporteImpactoPromocionesPage';

vi.mock('../api');

const PROMOCION: Promocion = {
  id: 3,
  nombre: 'Promo 10 %',
  tipo: 'PORCENTAJE',
  descripcion: null,
  fecha_desde: '2026-11-01',
  fecha_hasta: '2026-11-10',
  dias_semana: ['LUNES'],
  hora_desde: null,
  hora_hasta: null,
  descuento_porcentaje: 10,
  precio_fijo: null,
  cant_lleva: null,
  cant_paga: null,
  estado: 'HABILITADO',
  fecha_hora_finalizacion: null,
  productos: [],
};

function reporte(): ReporteImpactoPromociones {
  return {
    promocion: {
      id: 3,
      nombre: PROMOCION.nombre,
      estado: 'HABILITADO',
      fecha_desde: '2026-11-01',
      fecha_hasta: '2026-11-10',
      hora_desde: null,
      hora_hasta: null,
    },
    fecha_desde: '2026-11-01',
    fecha_hasta: '2026-11-10',
    dias_promocion: 2,
    dias_fuera: 8,
    horas_promocion_por_dia: null,
    unidad_promedio: 'DIA',
    hay_datos: true,
    lineas: [
      {
        producto_id: 1,
        nombre: 'Milanesa',
        estado: 'HABILITADO',
        promedio_durante: '30.00',
        promedio_fuera: '10.00',
        diferencia_promedio: '20.00',
        impacto_estimado: '40.00',
        variacion_porcentual: '200.00',
        cantidad_durante: 60,
        cantidad_fuera: 80,
        dias_con_ventas_promocion: 2,
      },
      {
        producto_id: 2,
        nombre: 'Pizza',
        estado: 'DESHABILITADO',
        promedio_durante: '5.00',
        promedio_fuera: '0.00',
        diferencia_promedio: '5.00',
        impacto_estimado: '5.00',
        variacion_porcentual: null,
        cantidad_durante: 5,
        cantidad_fuera: 0,
        dias_con_ventas_promocion: 1,
      },
    ],
  };
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/reportes/impacto-promociones']}>
      <Routes>
        <Route path="/reportes/impacto-promociones" element={<ReporteImpactoPromocionesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function cargarFiltros() {
  fireEvent.change(screen.getByLabelText('Fecha desde'), {
    target: { value: '2026-11-01' },
  });
  fireEvent.change(screen.getByLabelText('Fecha hasta'), {
    target: { value: '2026-11-10' },
  });
  await screen.findByRole('option', { name: 'Promo 10 %' });
  fireEvent.change(screen.getByLabelText('Promoción'), { target: { value: '3' } });
}

beforeEach(() => {
  vi.mocked(listarPromociones).mockResolvedValue({
    datos: { items: [PROMOCION], total: 1, limit: 100, offset: 0 },
    exito: true,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReporteImpactoPromocionesPage', () => {
  it('al abrir muestra fechas, promoción y Generar sin consultar el reporte', async () => {
    renderizar();

    expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Promoción')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Promo 10 %' })).toBeInTheDocument();
    expect(obtenerReporteImpactoPromociones).not.toHaveBeenCalled();
  });

  it('sin fechas avisa el dato faltante y no genera el reporte (CA 2)', async () => {
    renderizar();

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByText('Faltan la fecha desde y la fecha hasta.')).toBeInTheDocument();
    expect(obtenerReporteImpactoPromociones).not.toHaveBeenCalled();
  });

  it('genera el reporte y muestra promedios, variación y aviso promocional (CA 1 y 4)', async () => {
    vi.mocked(obtenerReporteImpactoPromociones).mockResolvedValue({
      datos: reporte(),
      exito: true,
    });
    renderizar();
    await cargarFiltros();

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    const celda = await screen.findByRole('cell', { name: 'Milanesa' });
    const fila = celda.closest('tr') as HTMLElement;
    expect(within(fila).getByText('30,00')).toBeInTheDocument();
    expect(within(fila).getByText('10,00')).toBeInTheDocument();
    expect(within(fila).getByText('+200,00 %')).toBeInTheDocument();
    expect(obtenerReporteImpactoPromociones).toHaveBeenCalledWith('2026-11-01', '2026-11-10', 3);

    const filaPizza = screen.getByRole('cell', { name: /Pizza/ }).closest('tr') as HTMLElement;
    expect(
      within(filaPizza).getByText('100 % de las ventas fueron promocionales'),
    ).toBeInTheDocument();
  });

  it('avisa cuando la promoción no tuvo ventas en el período (CA 5)', async () => {
    vi.mocked(obtenerReporteImpactoPromociones).mockResolvedValue({
      datos: { ...reporte(), hay_datos: false, lineas: [] },
      exito: true,
    });
    renderizar();
    await cargarFiltros();

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText('No hay datos para comparar en el período seleccionado.'),
    ).toBeInTheDocument();
  });
});
