import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ProductoCarta, SeccionCarta } from '../types';

import { CartaSeccion } from './CartaSeccion';

const FLAN: ProductoCarta = {
  id: 5,
  nombre: 'Flan',
  categoria: 'POSTRE',
  precio: '3000.00',
  descripcion: null,
  etiquetas: [],
  imagen_url: null,
  estado: 'HABILITADO',
};

const POSTRES: SeccionCarta = {
  id: 4,
  nombre: 'Postres',
  orden: 2,
  estado: 'HABILITADO',
  productos: [FLAN],
};

describe('CartaSeccion', () => {
  it('es una seccion con ancla, titulo y una tarjeta por producto', () => {
    const { container } = render(<CartaSeccion seccion={POSTRES} filtro="HABILITADO" />);

    expect(container.querySelector('section#seccion-4')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Postres' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flan' })).toBeInTheDocument();
    expect(screen.queryByText('Habilitada')).not.toBeInTheDocument();
  });

  it('muestra la insignia de estado de la seccion fuera de Habilitados', () => {
    render(
      <CartaSeccion seccion={{ ...POSTRES, estado: 'DESHABILITADO' }} filtro="DESHABILITADO" />,
    );

    expect(screen.getByText('Deshabilitada')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
  });

  it('avisa que la seccion no tiene productos en Todos', () => {
    render(<CartaSeccion seccion={{ ...POSTRES, productos: [] }} filtro="TODOS" />);

    expect(screen.getByText('Sección sin productos.')).toBeInTheDocument();
  });

  it('avisa que no hay productos dados de baja en Deshabilitados', () => {
    render(
      <CartaSeccion
        seccion={{ ...POSTRES, estado: 'DESHABILITADO', productos: [] }}
        filtro="DESHABILITADO"
      />,
    );

    expect(screen.getByText('Sin productos dados de baja')).toBeInTheDocument();
  });
});
