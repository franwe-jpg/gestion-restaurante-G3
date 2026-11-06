import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GraficoMasVendidos } from './GraficoMasVendidos';

describe('GraficoMasVendidos', () => {
  it('muestra una barra por producto con su cantidad', () => {
    render(
      <GraficoMasVendidos
        productos={[
          { id: 1, etiqueta: 'Ñoquis', cantidad: 9 },
          { id: 2, etiqueta: 'Flan (Deshabilitado)', cantidad: 3 },
        ]}
        acciones={<button type="button">Descargar PDF</button>}
      />,
    );

    expect(screen.getByText('Ñoquis')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Flan (Deshabilitado)')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('El detalle completo está en el reporte PDF.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });

  it('sin productos muestra que no hay datos y ningun grafico', () => {
    render(<GraficoMasVendidos productos={[]} />);

    expect(screen.getByText('No hay datos para el período elegido.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Productos más pedidos' })).not.toBeInTheDocument();
  });
});
