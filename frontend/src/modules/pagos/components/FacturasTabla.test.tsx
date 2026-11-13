import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FacturaResumen } from '../types';

import { FacturasTabla } from './FacturasTabla';

const ADEUDADA: FacturaResumen = {
  id: 7,
  comanda_id: 12,
  fecha_emision: '2026-11-05T15:00:00Z',
  total: '7101.00',
  saldo_pendiente: '6101.00',
  estado: 'ADEUDADA',
};

const PAGADA: FacturaResumen = {
  ...ADEUDADA,
  id: 8,
  comanda_id: 13,
  saldo_pendiente: '0.00',
  estado: 'PAGADA',
};

function mostrar(facturas: FacturaResumen[], onCobrar = vi.fn(), onVerComprobantes = vi.fn()) {
  render(
    <FacturasTabla facturas={facturas} onCobrar={onCobrar} onVerComprobantes={onVerComprobantes} />,
  );
  return onCobrar;
}

describe('FacturasTabla (HU-M6-02)', () => {
  it('muestra el N°, la comanda, el total, el saldo y el estado', () => {
    mostrar([ADEUDADA]);

    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getByText('$ 7.101,00')).toBeInTheDocument();
    expect(screen.getByText('$ 6.101,00')).toBeInTheDocument();
    expect(screen.getByText('Adeudada')).toBeInTheDocument();
  });

  it('solo permite cobrar las facturas adeudadas', () => {
    const onCobrar = mostrar([ADEUDADA, PAGADA]);

    expect(screen.getAllByRole('button', { name: /Cobrar la factura/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cobrar la factura 7' }));

    expect(onCobrar).toHaveBeenCalledWith(ADEUDADA);
  });

  it('permite ver los comprobantes de cualquier factura (HU-M6-03)', () => {
    const onVerComprobantes = vi.fn();
    mostrar([ADEUDADA, PAGADA], vi.fn(), onVerComprobantes);

    expect(screen.getAllByRole('button', { name: /Ver los comprobantes/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los comprobantes de la factura 8' }));

    expect(onVerComprobantes).toHaveBeenCalledWith(PAGADA);
  });

  it('avisa cuando no hay facturas', () => {
    mostrar([]);

    expect(screen.getByText('No hay facturas emitidas.')).toBeInTheDocument();
  });
});
