import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { obtenerCarta, urlDeImagen } from '../api';
import type { SeccionCarta } from '../types';

import { CartaPage } from './CartaPage';

vi.mock('../api');

const SECCIONES: SeccionCarta[] = [
  {
    id: 1,
    nombre: 'Principales',
    orden: 1,
    estado: 'HABILITADO',
    productos: [
      {
        id: 10,
        nombre: 'Milanesa',
        categoria: 'PLATO',
        precio: '12500.50',
        descripcion: 'Con papas',
        etiquetas: [],
        imagen_url: null,
        estado: 'HABILITADO',
      },
    ],
  },
  {
    id: 2,
    nombre: 'Postres',
    orden: 2,
    estado: 'HABILITADO',
    productos: [
      {
        id: 11,
        nombre: 'Flan',
        categoria: 'POSTRE',
        precio: '3000.00',
        descripcion: null,
        etiquetas: [],
        imagen_url: null,
        estado: 'HABILITADO',
      },
    ],
  },
];

function respuesta(secciones: SeccionCarta[]) {
  return { datos: secciones, exito: true };
}

function abrir() {
  render(
    <MemoryRouter initialEntries={['/productos/carta']}>
      <Routes>
        <Route path="/productos" element={<p>Lista de productos</p>} />
        <Route path="/productos/carta" element={<CartaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function selector() {
  return screen.getByRole('combobox', { name: 'Filtrar por estado' });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('CartaPage', () => {
  it('abre en Habilitados, pide la carta y muestra las secciones en orden', async () => {
    vi.mocked(urlDeImagen).mockReturnValue(null);
    vi.mocked(obtenerCarta).mockResolvedValue(respuesta(SECCIONES));

    abrir();

    expect(screen.getByText('Cargando carta...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Principales' })).toBeInTheDocument();
    expect(obtenerCarta).toHaveBeenCalledWith('HABILITADO');
    expect(selector()).toHaveValue('HABILITADO');
    expect(screen.getByRole('heading', { level: 1, name: 'Carta' })).toBeInTheDocument();
    expect(
      screen.getByText('Secciones y productos tal como se muestran al cliente.'),
    ).toBeInTheDocument();
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Principales', 'Postres']);
    expect(screen.queryByText('Habilitada')).not.toBeInTheDocument();
    expect(screen.queryByText('Habilitado')).not.toBeInTheDocument();
  });

  it('ofrece un enlace de ancla por cada seccion visible', async () => {
    vi.mocked(urlDeImagen).mockReturnValue(null);
    vi.mocked(obtenerCarta).mockResolvedValue(respuesta(SECCIONES));

    abrir();

    const navegacion = await screen.findByRole('navigation', { name: 'Secciones de la carta' });
    const enlaces = within(navegacion).getAllByRole('link');
    expect(enlaces.map((e) => [e.textContent, e.getAttribute('href')])).toEqual([
      ['Principales', '#seccion-1'],
      ['Postres', '#seccion-2'],
    ]);
  });
});

describe('CartaPage, filtros y estados', () => {
  it('vuelve a pedir la carta al cambiar a Deshabilitados y a Todos, con insignias', async () => {
    vi.mocked(urlDeImagen).mockReturnValue(null);
    vi.mocked(obtenerCarta).mockResolvedValue(respuesta(SECCIONES));
    abrir();
    await screen.findByRole('heading', { name: 'Principales' });

    fireEvent.change(selector(), { target: { value: 'DESHABILITADO' } });
    await screen.findAllByText('Habilitada');
    expect(obtenerCarta).toHaveBeenLastCalledWith('DESHABILITADO');

    fireEvent.change(selector(), { target: { value: 'TODOS' } });
    await screen.findAllByText('Habilitado');
    expect(obtenerCarta).toHaveBeenLastCalledWith('TODOS');
  });

  it.each([
    ['HABILITADO', 'No hay productos habilitados en la carta.'],
    ['DESHABILITADO', 'No hay secciones ni productos dados de baja.'],
    ['TODOS', 'No hay secciones cargadas.'],
  ] as const)('muestra el vacio de %s', async (filtro, texto) => {
    vi.mocked(obtenerCarta).mockResolvedValue(respuesta([]));
    abrir();
    await screen.findByText('No hay productos habilitados en la carta.');

    fireEvent.change(selector(), { target: { value: filtro } });

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones de la carta' })).toBeNull();
  });

  it('muestra el error y reintenta', async () => {
    vi.mocked(urlDeImagen).mockReturnValue(null);
    vi.mocked(obtenerCarta)
      .mockResolvedValueOnce({ datos: null, exito: false, error: 'Sin conexión' })
      .mockResolvedValueOnce(respuesta(SECCIONES));
    abrir();

    expect(await screen.findByText('No se pudo cargar la carta.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Principales' })).toBeInTheDocument();
    expect(obtenerCarta).toHaveBeenCalledTimes(2);
  });

  it('las migas llevan de vuelta a Productos y Carta', async () => {
    vi.mocked(obtenerCarta).mockResolvedValue(respuesta([]));
    abrir();

    fireEvent.click(await screen.findByRole('link', { name: 'Productos y Carta' }));

    expect(screen.getByText('Lista de productos')).toBeInTheDocument();
  });
});
