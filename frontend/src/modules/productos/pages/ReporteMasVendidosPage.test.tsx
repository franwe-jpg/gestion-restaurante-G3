import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReportePdf, obtenerReporteMasVendidos } from '../api';
import type { LineaReporteProductos, ReporteProductosMasVendidos } from '../types';

import { ReporteMasVendidosPage } from './ReporteMasVendidosPage';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

function linea(
  id: number,
  nombre: string,
  cantidad: number,
  estado: 'HABILITADO' | 'DESHABILITADO' = 'HABILITADO',
): LineaReporteProductos {
  return {
    producto_id: id,
    nombre,
    estado,
    cantidad_pedida: cantidad,
    dias_mas_pedidos: ['VIERNES'],
    franjas_mas_pedidas: [{ hora_desde: 21, hora_hasta: 22 }],
  };
}

function reporte(secciones: LineaReporteProductos[][]): ReporteProductosMasVendidos {
  return {
    fecha_desde: '2026-11-01',
    fecha_hasta: '2026-11-05',
    secciones: secciones.map((productos, i) => ({
      id: i + 1,
      nombre: `Seccion ${i + 1}`,
      orden: i,
      productos,
    })),
  };
}

function ok(datos: ReporteProductosMasVendidos) {
  vi.mocked(obtenerReporteMasVendidos).mockResolvedValue({ datos, exito: true });
}

function renderizar(inicial = '/reportes/productos-mas-vendidos') {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route path="/reportes/productos-mas-vendidos" element={<ReporteMasVendidosPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function cargarFechas(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: hasta } });
}

async function itemsDelGrafico() {
  const lista = await screen.findByRole('list', { name: 'Productos más pedidos' });
  return within(lista).getAllByRole('listitem');
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReporteMasVendidosPage', () => {
  it('al abrir muestra los campos y Generar, sin resultado ni Descargar PDF', () => {
    renderizar();

    expect(screen.getByLabelText('Fecha desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha hasta')).toBeInTheDocument();
    expect(screen.getByText('Elegí el período y presioná Generar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descargar PDF' })).not.toBeInTheDocument();
    expect(obtenerReporteMasVendidos).not.toHaveBeenCalled();
  });

  it('abre con el mes en curso y genera sin tocar las fechas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    ok(reporte([[linea(1, 'A', 3)]]));
    try {
      renderizar();

      expect(screen.getByLabelText('Fecha desde')).toHaveValue('2026-11-01');
      expect(screen.getByLabelText('Fecha hasta')).toHaveValue('2026-11-13');

      fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

      expect(await screen.findByText('A')).toBeInTheDocument();
      expect(obtenerReporteMasVendidos).toHaveBeenCalledWith('2026-11-01', '2026-11-13');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ReporteMasVendidosPage: gráfico', () => {
  it('muestra solo los 5 mayores de 8 productos en tres secciones', async () => {
    ok(
      reporte([
        [linea(1, 'P1', 1), linea(2, 'P2', 9), linea(3, 'P3', 4)],
        [linea(4, 'P4', 7), linea(5, 'P5', 2)],
        [linea(6, 'P6', 8), linea(7, 'P7', 3), linea(8, 'P8', 5)],
      ]),
    );
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await itemsDelGrafico()).toHaveLength(5);
    for (const nombre of ['P2', 'P6', 'P4', 'P8', 'P3']) {
      expect(screen.getByText(nombre)).toBeInTheDocument();
    }
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.queryByText('Seccion 1')).not.toBeInTheDocument();
    expect(screen.queryByText(/viernes/i)).not.toBeInTheDocument();
    expect(obtenerReporteMasVendidos).toHaveBeenCalledWith('2026-11-01', '2026-11-05');
  });

  it('con 3 productos muestra los 3 y el texto del PDF', async () => {
    ok(reporte([[linea(1, 'A', 3), linea(2, 'B', 2), linea(3, 'C', 1, 'DESHABILITADO')]]));
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await itemsDelGrafico()).toHaveLength(3);
    expect(screen.getByText('C (Deshabilitado)')).toBeInTheDocument();
    expect(screen.getByText('El detalle completo está en el reporte PDF.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });
});

describe('descarga del PDF', () => {
  it('Descargar PDF pide el PDF del periodo y lo guarda', async () => {
    ok(reporte([[linea(1, 'A', 3)]]));
    const blob = new Blob(['%PDF']);
    vi.mocked(descargarReportePdf).mockResolvedValue({ datos: blob, exito: true });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Descargar PDF' }));

    await waitFor(() => {
      expect(guardarArchivo).toHaveBeenCalledWith(
        blob,
        'productos-mas-vendidos_2026-11-01_2026-11-05.pdf',
      );
    });
    expect(descargarReportePdf).toHaveBeenCalledWith('2026-11-01', '2026-11-05');
  });

  it('informa si falla la descarga del PDF', async () => {
    ok(reporte([[linea(1, 'A', 3)]]));
    vi.mocked(descargarReportePdf).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'x',
    });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Descargar PDF' }));

    expect(await screen.findByText('No se pudo descargar el PDF.')).toBeInTheDocument();
    expect(guardarArchivo).not.toHaveBeenCalled();
  });
});

describe('estados del reporte', () => {
  it('sin secciones informa que no hay datos y no muestra grafico', async () => {
    ok(reporte([]));
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByText('No hay datos para el período elegido.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Productos más pedidos' })).not.toBeInTheDocument();
  });

  it.each([
    ['', '2026-11-05', 'Falta la fecha desde.'],
    ['2026-11-01', '', 'Falta la fecha hasta.'],
    [
      '2026-11-10',
      '2026-11-05',
      'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    ],
  ])('no consulta con desde=%s hasta=%s', (desde, hasta, mensaje) => {
    renderizar();
    cargarFechas(desde, hasta);

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(obtenerReporteMasVendidos).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Descargar PDF' })).not.toBeInTheDocument();
  });

  it('informa si la consulta falla', async () => {
    vi.mocked(obtenerReporteMasVendidos).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'x',
    });
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByText('No se pudo cargar el reporte.')).toBeInTheDocument();
  });
});

describe('ReporteMasVendidosPage: migas y período', () => {
  it('las migas son Reportes (enlace a /reportes) y Productos más vendidos', () => {
    renderizar();

    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('href', '/reportes');
    expect(screen.queryByRole('link', { name: 'Productos y Carta' })).not.toBeInTheDocument();
  });

  it('el subtítulo muestra el período como dd/mm/aaaa', async () => {
    ok(reporte([[linea(1, 'P1', 3)]]));
    renderizar();
    cargarFechas('2026-11-01', '2026-11-05');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    await itemsDelGrafico();
    expect(screen.getByText('Del 01/11/2026 al 05/11/2026')).toBeInTheDocument();
  });
});
