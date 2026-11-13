import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listarMozos, listarSectores, obtenerReporteMozos } from '../api';
import type { ReporteMesasVentasPorMozo } from '../types';

import { ReporteMozosPage } from './ReporteMozosPage';

vi.mock('../api');

const MOZO = {
  id: 1,
  dni: '30123456',
  nombre: 'Ana',
  apellido: 'Pérez',
  telefono: null,
  estado: 'HABILITADO' as const,
  correo: 'ana@resto.com',
};

const SECTOR = {
  id: 1,
  nombre: 'Salón',
  descripcion: null,
  estado: 'HABILITADO' as const,
};

function reporte(totalVentas = '40.00'): ReporteMesasVentasPorMozo {
  const sinVentas = Number(totalVentas) === 0;
  return {
    fecha_desde: '2026-11-01',
    fecha_hasta: '2026-11-05',
    lineas: [
      {
        mozo_id: 1,
        nombre: 'Ana',
        apellido: 'Pérez',
        mesas_atendidas: sinVentas ? 0 : 2,
        total_ventas: totalVentas,
        promedio_por_mesa: sinVentas ? '0.00' : '20.00',
      },
    ],
    total_mesas_atendidas: sinVentas ? 0 : 2,
    total_ventas: totalVentas,
    promedio_general: sinVentas ? '0.00' : '20.00',
  };
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/reportes/mesas-ventas-por-mozo']}>
      <Routes>
        <Route path="/reportes/mesas-ventas-por-mozo" element={<ReporteMozosPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function cargarFechas(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: hasta } });
}

beforeEach(() => {
  vi.mocked(listarMozos).mockResolvedValue({
    datos: { items: [MOZO], total: 1, limit: 100, offset: 0 },
    exito: true,
  });
  vi.mocked(listarSectores).mockResolvedValue({
    datos: { items: [SECTOR], total: 1, limit: 100, offset: 0 },
    exito: true,
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReporteMozosPage - filtros', () => {
  it('al abrir muestra el período, los filtros y Generar, sin consultar el reporte', () => {
    renderizar();

    expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha hasta')).toBeInTheDocument();
    expect(screen.getByLabelText('Mozo')).toBeInTheDocument();
    expect(screen.getByLabelText('Sector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar' })).toBeInTheDocument();
    expect(obtenerReporteMozos).not.toHaveBeenCalled();
  });

  it('con un período incompleto informa el error y no genera el reporte (CA 7)', async () => {
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), {
      target: { value: '2026-11-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByText('Falta la fecha hasta.')).toBeInTheDocument();
    expect(obtenerReporteMozos).not.toHaveBeenCalled();
  });

  it('abre con el mes en curso, muestra el estado inicial y genera sin tocar las fechas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    vi.mocked(obtenerReporteMozos).mockResolvedValue({ datos: reporte(), exito: true });
    try {
      renderizar();

      expect(screen.getByLabelText('Fecha desde')).toHaveValue('2026-11-01');
      expect(screen.getByLabelText('Fecha hasta')).toHaveValue('2026-11-13');
      expect(screen.getByText('Elegí el período y presioná Generar')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

      expect(await screen.findByRole('cell', { name: 'Pérez, Ana' })).toBeInTheDocument();
      expect(obtenerReporteMozos).toHaveBeenCalledWith('2026-11-01', '2026-11-13', null, null);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ReporteMozosPage - resultados', () => {
  it('genera el reporte y muestra totales y la fila de cada mozo (CA 1, 2 y 4)', async () => {
    vi.mocked(obtenerReporteMozos).mockResolvedValue({ datos: reporte(), exito: true });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    const celda = await screen.findByRole('cell', { name: 'Pérez, Ana' });
    expect(celda).toBeInTheDocument();
    expect(obtenerReporteMozos).toHaveBeenCalledWith('2026-11-01', '2026-11-05', null, null);
    expect(screen.getAllByText('Mesas atendidas').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/40,00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Promedio general por mesa')).toBeInTheDocument();
    const fila = celda.closest('tr');
    expect(within(fila as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(fila as HTMLElement).getByText(/20,00/)).toBeInTheDocument();
  });

  it('envía los filtros opcionales de mozo y sector (CA 5)', async () => {
    vi.mocked(obtenerReporteMozos).mockResolvedValue({ datos: reporte(), exito: true });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');
    await screen.findByRole('option', { name: 'Pérez, Ana' });
    await screen.findByRole('option', { name: 'Salón' });
    fireEvent.change(screen.getByLabelText('Mozo'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByRole('cell', { name: 'Pérez, Ana' })).toBeInTheDocument();
    expect(obtenerReporteMozos).toHaveBeenCalledWith('2026-11-01', '2026-11-05', 1, 1);
  });
});

describe('ReporteMozosPage - actualización', () => {
  it('sin ventas informa que no hay datos disponibles (CA 6)', async () => {
    vi.mocked(obtenerReporteMozos).mockResolvedValue({
      datos: reporte('0.00'),
      exito: true,
    });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText('No hay datos disponibles para el período seleccionado.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('al cambiar el período y generar de nuevo actualiza los datos (CA 8)', async () => {
    vi.mocked(obtenerReporteMozos)
      .mockResolvedValueOnce({ datos: reporte('40.00'), exito: true })
      .mockResolvedValueOnce({ datos: reporte('10.00'), exito: true });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    expect((await screen.findAllByText(/40,00/)).length).toBeGreaterThan(0);

    cargarFechas('2026-11-10', '2026-11-12');
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect((await screen.findAllByText(/10,00/)).length).toBeGreaterThan(0);
    expect(obtenerReporteMozos).toHaveBeenLastCalledWith('2026-11-10', '2026-11-12', null, null);
  });
});
