import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { obtenerReporteReservasAusentismo } from '../api';
import type { ResumenReservas } from '../types';

import { ReporteReservasAusentismoPage } from './ReporteReservasAusentismoPage';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

function resumen(datos: Partial<ResumenReservas> = {}): ResumenReservas {
  return {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-31',
    total_reservas: 8,
    atendidas: 1,
    canceladas_anticipada: 2,
    canceladas_por_ausencia: 5,
    porcentaje_ausentismo: '33.33',
    ...datos,
  };
}

function ok(datos: ResumenReservas) {
  vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({ datos, exito: true });
}

function renderizar(inicial = '/reportes/reservas-ausentismo') {
  return render(
    <MemoryRouter initialEntries={[inicial]}>
      <Routes>
        <Route path="/reportes/reservas-ausentismo" element={<ReporteReservasAusentismoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function cargarFechas(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: hasta } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReporteReservasAusentismoPage: con y sin datos', () => {
  it('con datos muestra los cinco datos y el porcentaje de ausentismo', async () => {
    ok(resumen());
    renderizar();
    cargarFechas('2026-10-01', '2026-10-31');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('33,33 %')).toBeInTheDocument();
  });

  it('sin datos muestra el mensaje y ningún texto con %', async () => {
    ok(
      resumen({
        total_reservas: 0,
        atendidas: 0,
        canceladas_anticipada: 0,
        canceladas_por_ausencia: 0,
        porcentaje_ausentismo: null,
      }),
    );
    renderizar();
    cargarFechas('2026-01-01', '2026-01-31');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText('No hay datos para el período seleccionado'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe('ReporteReservasAusentismoPage: botón de descarga', () => {
  it('el botón Descargar PDF está presente con datos', async () => {
    ok(resumen());
    renderizar();
    cargarFechas('2026-10-01', '2026-10-31');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(await screen.findByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });

  it('el botón Descargar PDF está presente sin datos', async () => {
    ok(resumen({ total_reservas: 0, porcentaje_ausentismo: null }));
    renderizar();
    cargarFechas('2026-01-01', '2026-01-31');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText('No hay datos para el período seleccionado'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });
});

describe('ReporteReservasAusentismoPage: validación y errores', () => {
  it('sin elegir fecha hasta muestra el mensaje local y no llama a la API', () => {
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), {
      target: { value: '2026-10-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(screen.getByText('Falta la fecha hasta.')).toBeInTheDocument();
    expect(obtenerReporteReservasAusentismo).not.toHaveBeenCalled();
  });

  it('un 422 de la API muestra su detalle', async () => {
    vi.mocked(obtenerReporteReservasAusentismo).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    });
    renderizar();
    cargarFechas('2026-10-31', '2026-10-01');

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText(
        'El período es inválido: la fecha desde es posterior a la fecha hasta.',
      ),
    ).toBeInTheDocument();
  });
});
