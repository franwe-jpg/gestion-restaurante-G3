import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Mesa, Sector } from '../types';

import { contarMesasPorEstado, contarSectoresHabilitados } from './conteosDelSalon';
import { ResumenDelSalon } from './ResumenDelSalon';

const SECTORES: Sector[] = [
  { id: 1, nombre: 'Salón principal', descripcion: null, estado: 'HABILITADO' },
  { id: 2, nombre: 'Terraza', descripcion: null, estado: 'HABILITADO' },
  { id: 3, nombre: 'Reservado', descripcion: null, estado: 'DESHABILITADO' },
];

const MESAS: Mesa[] = [
  { id: 1, numero: 1, capacidad: 2, sector: { id: 1, nombre: 'Salón principal' }, estado: 'LIBRE' },
  {
    id: 2,
    numero: 2,
    capacidad: 4,
    sector: { id: 1, nombre: 'Salón principal' },
    estado: 'OCUPADA',
  },
  {
    id: 3,
    numero: 1,
    capacidad: 6,
    sector: { id: 2, nombre: 'Terraza' },
    estado: 'FUERA_DE_SERVICIO',
  },
];

describe('ResumenDelSalon: conteos', () => {
  it('cuenta los sectores habilitados y las mesas por estado', () => {
    expect(contarSectoresHabilitados(SECTORES)).toBe(2);
    expect(contarMesasPorEstado(MESAS, 'LIBRE')).toBe(1);
    expect(contarMesasPorEstado(MESAS, 'OCUPADA')).toBe(1);
    expect(contarMesasPorEstado(MESAS, 'FUERA_DE_SERVICIO')).toBe(1);
  });

  it('muestra el estado del salón con etiquetas concretas', () => {
    render(<ResumenDelSalon sectores={SECTORES} mesas={MESAS} />);

    expect(screen.getByRole('region', { name: 'Estado del salón' })).toBeInTheDocument();
    expect(screen.getByText('Sectores habilitados')).toBeInTheDocument();
    expect(screen.getByText('Mesas libres')).toBeInTheDocument();
    expect(screen.getByText('Mesas ocupadas')).toBeInTheDocument();
    expect(screen.getByText('Mesas fuera de servicio')).toBeInTheDocument();
  });
});
