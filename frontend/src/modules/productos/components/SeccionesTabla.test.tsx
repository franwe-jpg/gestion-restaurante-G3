import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SeccionListado } from '../types';

import { SeccionesTabla } from './SeccionesTabla';

const SECCIONES: SeccionListado[] = [
  {
    id: 1,
    nombre: 'Entradas',
    orden: 1,
    estado: 'HABILITADO',
    cantidad_productos: 6,
    productos_habilitados: 5,
  },
  {
    id: 2,
    nombre: 'Parrilla',
    orden: 6,
    estado: 'DESHABILITADO',
    cantidad_productos: 0,
    productos_habilitados: 0,
  },
];

describe('SeccionesTabla', () => {
  it('muestra orden, nombre, cantidad de productos y estado', () => {
    render(<SeccionesTabla secciones={SECCIONES} />);

    const filas = screen.getAllByRole('row');
    expect(filas).toHaveLength(3);
    const primera = within(filas[1]!);
    expect(primera.getByText('1')).toBeInTheDocument();
    expect(primera.getByText('Entradas')).toBeInTheDocument();
    expect(primera.getByText('6')).toBeInTheDocument();
    expect(primera.getByText('Habilitada')).toBeInTheDocument();
    expect(within(filas[2]!).getByText('Deshabilitada')).toBeInTheDocument();
  });

  it('muestra las acciones de cada fila con renderAcciones', () => {
    render(
      <SeccionesTabla
        secciones={SECCIONES}
        renderAcciones={(seccion) => <span>Acciones de {seccion.nombre}</span>}
      />,
    );

    expect(screen.getByText('Acciones de Entradas')).toBeInTheDocument();
    expect(screen.getByText('Acciones de Parrilla')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay secciones', () => {
    render(<SeccionesTabla secciones={[]} />);

    expect(screen.getByText('Todavía no hay secciones')).toBeInTheDocument();
  });

  it('muestra el error de carga', () => {
    render(<SeccionesTabla secciones={[]} error="No se pudo conectar con el backend" />);

    expect(screen.getByText('No se pudo conectar con el backend')).toBeInTheDocument();
  });
});
