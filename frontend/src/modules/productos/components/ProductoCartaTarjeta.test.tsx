import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { urlDeImagen } from '../api';
import type { ProductoCarta } from '../types';

import { ProductoCartaTarjeta } from './ProductoCartaTarjeta';

vi.mock('../api');

const MILANESA: ProductoCarta = {
  id: 1,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  precio: '12500.50',
  descripcion: 'Con papas fritas',
  etiquetas: ['Sin TACC', 'Vegano'],
  imagen_url: '/media/a.jpg',
  estado: 'HABILITADO',
};

afterEach(() => {
  vi.resetAllMocks();
});

describe('ProductoCartaTarjeta', () => {
  it('muestra nombre, precio, descripcion, etiquetas e imagen diferida', () => {
    vi.mocked(urlDeImagen).mockReturnValue('http://api.test/media/a.jpg');

    render(<ProductoCartaTarjeta producto={MILANESA} />);

    expect(screen.getByRole('heading', { name: 'Milanesa' })).toBeInTheDocument();
    expect(screen.getByText(/12\.500,50/)).toBeInTheDocument();
    expect(screen.getByText('Con papas fritas')).toBeInTheDocument();
    expect(screen.getByText('Sin TACC')).toBeInTheDocument();
    expect(screen.getByText('Vegano')).toBeInTheDocument();
    const imagen = screen.getByRole('img', { name: 'Milanesa' });
    expect(imagen).toHaveAttribute('src', 'http://api.test/media/a.jpg');
    expect(imagen).toHaveAttribute('loading', 'lazy');
    expect(urlDeImagen).toHaveBeenCalledWith('/media/a.jpg');
  });

  it('omite la descripcion y muestra el marcador cuando no hay imagen', () => {
    vi.mocked(urlDeImagen).mockReturnValue(null);

    render(
      <ProductoCartaTarjeta
        producto={{ ...MILANESA, descripcion: null, etiquetas: [], imagen_url: null }}
      />,
    );

    expect(screen.queryByText('Con papas fritas')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
  });

  it.each([
    ['HABILITADO', 'Habilitado'],
    ['DESHABILITADO', 'Deshabilitado'],
  ] as const)('muestra la insignia %s solo si se pide', (estado, texto) => {
    vi.mocked(urlDeImagen).mockReturnValue(null);
    const producto = { ...MILANESA, estado };

    const { rerender } = render(<ProductoCartaTarjeta producto={producto} />);
    expect(screen.queryByText(texto)).not.toBeInTheDocument();

    rerender(<ProductoCartaTarjeta producto={producto} mostrarEstado />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });
});
