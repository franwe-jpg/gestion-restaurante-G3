import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerReporteComandas } from '../api';
import { ReporteComandasPage } from './ReporteComandasPage';

vi.mock('../api', () => ({ obtenerReporteComandas: vi.fn() }));

const respuesta = {
  fecha_desde: '2026-11-12',
  fecha_hasta: '2026-11-12',
  turno: 'ALMUERZO' as const,
  grupos: [
    {
      fecha: '2026-11-12',
      turno: 'ALMUERZO' as const,
      cantidad_comandas: 2,
      importe_total: '30.00',
      ticket_promedio: '15.00',
    },
  ],
  total_comandas: 2,
  importe_total: '30.00',
  ticket_promedio: '15.00',
};

function renderizar() {
  return render(
    <MemoryRouter>
      <ReporteComandasPage />
    </MemoryRouter>,
  );
}

describe('ReporteComandasPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía fechas y turno y presenta totales y grupos', async () => {
    vi.mocked(obtenerReporteComandas).mockResolvedValue({ exito: true, datos: respuesta });
    renderizar();

    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: 'ALMUERZO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(obtenerReporteComandas).toHaveBeenCalledWith('2026-11-12', '2026-11-12', 'ALMUERZO');
    expect(await screen.findByText('Comandas cerradas')).toBeInTheDocument();
    expect(screen.getByText('Cantidad de comandas')).toBeInTheDocument();
    expect(screen.getAllByText('Ticket promedio')).toHaveLength(2);
    expect(screen.getAllByText('Almuerzo')).toHaveLength(2);
  });

  it('invita a generar el reporte antes de consultar', () => {
    renderizar();

    expect(screen.getByText('Elegí el período y presioná Generar')).toBeInTheDocument();
    expect(obtenerReporteComandas).not.toHaveBeenCalled();
  });

  it('no consulta la API con un rango inverso', () => {
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-11-13' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(screen.getByText(/fecha desde es posterior/)).toBeInTheDocument();
    expect(obtenerReporteComandas).not.toHaveBeenCalled();
  });

  it('informa si no hay comandas en el período', async () => {
    vi.mocked(obtenerReporteComandas).mockResolvedValue({
      exito: true,
      datos: {
        ...respuesta,
        grupos: [],
        total_comandas: 0,
        importe_total: '0.00',
        ticket_promedio: '0.00',
      },
    });
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText('No hay datos para el período seleccionado'),
    ).toBeInTheDocument();
  });
});
