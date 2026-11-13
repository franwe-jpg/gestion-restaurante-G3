import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatearMoneda } from '../../../shared/lib/format';
import { descargarReporteRecaudacionPdf, obtenerReporteRecaudacion } from '../api';
import type { ResumenRecaudacion } from '../types';

import { ReporteRecaudacionPage } from './ReporteRecaudacionPage';

vi.mock('../api');
vi.mock('../../../shared/lib/guardarArchivo');

/** Intl usa espacio duro; Testing Library normaliza el del DOM, no el del texto buscado. */
function moneda(valor: number): string {
  return formatearMoneda(valor).replace(/\s/g, ' ');
}

const SIN_DATOS = 'No hay datos para el período seleccionado';

function resumen(datos: Partial<ResumenRecaudacion> = {}): ResumenRecaudacion {
  return {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-31',
    por_medio_pago: [
      {
        medio_pago_id: 1,
        nombre: 'Efectivo',
        tipo: 'EFECTIVO',
        cantidad_cobros: 2,
        monto: '1500.00',
      },
      {
        medio_pago_id: 2,
        nombre: 'Tarjeta',
        tipo: 'TARJETA',
        cantidad_cobros: 1,
        monto: '2000.00',
      },
    ],
    total_cobrado: '3500.00',
    adeudado: { cantidad_facturas: 2, monto: '500.50' },
    ...datos,
  };
}

const SOLO_DEUDA = { por_medio_pago: [], total_cobrado: '0.00' };
const VACIO = {
  ...SOLO_DEUDA,
  adeudado: { cantidad_facturas: 0, monto: '0.00' },
};

function ok(datos: ResumenRecaudacion) {
  vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({ datos, exito: true });
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/reportes/recaudacion-por-medio-de-pago']}>
      <Routes>
        <Route
          path="/reportes/recaudacion-por-medio-de-pago"
          element={<ReporteRecaudacionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function generar(datos?: ResumenRecaudacion) {
  if (datos) ok(datos);
  renderizar();
  fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-10-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ReporteRecaudacionPage: con y sin datos', () => {
  it('con datos muestra los totales, la deuda, la tabla por medio y la nota', async () => {
    await generar(resumen());

    expect(await screen.findByText(moneda(3500))).toBeInTheDocument();
    expect(screen.getByText(moneda(500.5))).toBeInTheDocument();
    expect(screen.getByText('2 facturas emitidas en el período')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^Efectivo Efectivo/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^Tarjeta Tarjeta/ })).toBeInTheDocument();
    expect(screen.getByText(moneda(1500))).toBeInTheDocument();
    expect(screen.getByText(moneda(2000))).toBeInTheDocument();
    expect(screen.getByText(/saldo pendiente actual/)).toBeInTheDocument();
  });

  it('con solo deuda muestra la deuda y "Sin cobros en el período"', async () => {
    await generar(resumen(SOLO_DEUDA));

    expect(await screen.findByText('Sin cobros en el período')).toBeInTheDocument();
    expect(screen.getByText(moneda(500.5))).toBeInTheDocument();
    expect(screen.queryByText(SIN_DATOS)).not.toBeInTheDocument();
  });

  it('con cobros y sin deuda muestra la tabla y no el estado vacío', async () => {
    await generar(resumen({ adeudado: { cantidad_facturas: 0, monto: '0.00' } }));

    expect(await screen.findByRole('row', { name: /^Efectivo Efectivo/ })).toBeInTheDocument();
    expect(screen.queryByText(SIN_DATOS)).not.toBeInTheDocument();
  });

  it('sin datos muestra el mensaje, sin tabla ni tarjetas', async () => {
    await generar(resumen(VACIO));

    expect(await screen.findByText(SIN_DATOS)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Total cobrado')).not.toBeInTheDocument();
  });

  it.each([
    ['con datos', resumen()],
    ['sin datos', resumen(VACIO)],
  ])('el botón Descargar PDF está presente %s', async (_caso, datos) => {
    await generar(datos);

    expect(await screen.findByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });
});

describe('ReporteRecaudacionPage: período por defecto', () => {
  it('abre con el mes en curso y genera sin tocar las fechas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 13, 12, 0, 0));
    ok(resumen());
    try {
      renderizar();

      expect(screen.getByLabelText('Fecha desde')).toHaveValue('2026-11-01');
      expect(screen.getByLabelText('Fecha hasta')).toHaveValue('2026-11-13');
      expect(screen.getByText('Elegí el período y presioná Generar')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

      expect(obtenerReporteRecaudacion).toHaveBeenCalledWith('2026-11-01', '2026-11-13');
      expect(await screen.findByText(moneda(3500))).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ReporteRecaudacionPage: validación y errores', () => {
  it('sin elegir fecha hasta muestra el mensaje local y no llama a la API', async () => {
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(screen.getByText('Falta la fecha hasta.')).toBeInTheDocument();
    expect(obtenerReporteRecaudacion).not.toHaveBeenCalled();
  });

  it('un 422 de la API muestra su detalle', async () => {
    vi.mocked(obtenerReporteRecaudacion).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El período es inválido: la fecha desde es posterior a la fecha hasta.',
    });
    renderizar();
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    expect(
      await screen.findByText(
        'El período es inválido: la fecha desde es posterior a la fecha hasta.',
      ),
    ).toBeInTheDocument();
  });

  it('si falla la descarga avisa y el resultado sigue visible', async () => {
    vi.mocked(descargarReporteRecaudacionPdf).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'No se pudo descargar el PDF.',
    });
    await generar(resumen());

    fireEvent.click(await screen.findByRole('button', { name: 'Descargar PDF' }));

    expect(await screen.findByText('No se pudo descargar el PDF.')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^Efectivo Efectivo/ })).toBeInTheDocument();
  });
});
