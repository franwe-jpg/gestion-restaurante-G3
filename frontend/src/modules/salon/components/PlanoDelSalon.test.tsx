import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Mesa } from '../types';

import { agruparMesasPorSector } from './gruposDelPlano';
import { PlanoDelSalon } from './PlanoDelSalon';

const SALON_1: Mesa = {
  id: 1,
  numero: 1,
  capacidad: 2,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

const TERRAZA_1: Mesa = {
  id: 2,
  numero: 1,
  capacidad: 6,
  sector: { id: 2, nombre: 'Terraza' },
  estado: 'OCUPADA',
};

describe('PlanoDelSalon: agrupación', () => {
  it('agrupa las mesas por sector ordenadas por nombre', () => {
    const grupos = agruparMesasPorSector([TERRAZA_1, SALON_1]);

    expect(grupos.map((grupo) => grupo.sectorNombre)).toEqual(['Salón principal', 'Terraza']);
  });

  it('muestra una tarjeta por mesa con su estado y capacidad', () => {
    render(
      <PlanoDelSalon mesas={[SALON_1, TERRAZA_1]} gestiona={false} puedeAbrirComanda={false} />,
    );

    expect(screen.getByRole('region', { name: 'Plano de mesas por sector' })).toBeInTheDocument();
    expect(screen.getByText('Salón principal · 1 mesa')).toBeInTheDocument();
    expect(screen.getByText('Terraza · 1 mesa')).toBeInTheDocument();
    expect(screen.getByText('Capacidad: 2 personas')).toBeInTheDocument();
  });

  it('sin mesas informa que no hay resultados para los filtros', () => {
    render(<PlanoDelSalon mesas={[]} gestiona={false} puedeAbrirComanda={false} />);

    expect(screen.getByText(/Sin mesas para los filtros elegidos/)).toBeInTheDocument();
  });

  it('las acciones del plano llaman con la mesa correspondiente', () => {
    const onAbrirComanda = vi.fn();
    render(
      <PlanoDelSalon
        mesas={[SALON_1]}
        gestiona={false}
        puedeAbrirComanda
        onAbrirComanda={onAbrirComanda}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda en la mesa 1 desde el plano' }),
    );

    expect(onAbrirComanda).toHaveBeenCalledWith(SALON_1);
  });
});
