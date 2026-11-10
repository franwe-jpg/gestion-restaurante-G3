import { fireEvent, render as renderizar, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import { MapaDelLocal } from './MapaDelLocal';
import type { MesaDelMapa } from './types';

vi.mock('./api', () => ({
  obtenerMapaDelLocal: vi.fn(),
  obtenerComandaAbierta: vi.fn(),
  obtenerCliente: vi.fn(),
  obtenerCajaDelDia: vi.fn(),
  hoyLocal: () => '2026-11-09',
}));

function mesa(
  id: number,
  sector: number,
  estadoVisible: MesaDelMapa['estadoVisible'],
  horaReserva?: string,
  capacidad = 4,
): MesaDelMapa {
  return {
    id,
    numero: id,
    capacidad,
    sector: { id: sector, nombre: sector === 1 ? 'Salón' : 'Terraza' },
    estado: estadoVisible === 'RESERVADA' ? 'LIBRE' : estadoVisible,
    estadoVisible,
    horaReserva,
  };
}

const MAPA = [
  mesa(1, 1, 'LIBRE', undefined, 2),
  mesa(2, 1, 'OCUPADA', undefined, 6),
  mesa(3, 2, 'RESERVADA', '20:30'),
  mesa(4, 2, 'FUERA_DE_SERVICIO', undefined, 8),
  mesa(5, 2, 'LIBRE'),
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.obtenerMapaDelLocal).mockResolvedValue({ exito: true, datos: MAPA });
});

function render(elemento: ReactElement) {
  return renderizar(<MemoryRouter>{elemento}</MemoryRouter>);
}

function pestana(nombre: RegExp) {
  return screen.getByRole('tab', { name: nombre });
}

function mesaDelPlano(nombre: string) {
  return screen.getByRole('button', { name: nombre });
}

function plano() {
  return screen.getByRole('group', { name: 'Plano del local' });
}

describe('MapaDelLocal', () => {
  it('muestra el indicador de carga hasta recibir datos', () => {
    vi.mocked(api.obtenerMapaDelLocal).mockReturnValue(new Promise(() => undefined));

    render(<MapaDelLocal />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  });

  it('dibuja un solo plano con una zona por sector y sus mesas con número y capacidad', async () => {
    render(<MapaDelLocal />);

    await screen.findByRole('heading', { name: 'Salón' });
    expect(api.obtenerMapaDelLocal).toHaveBeenCalledWith('2026-11-09');
    const salon = within(plano()).getByRole('heading', { name: 'Salón' }).closest('section');
    expect(within(plano()).getByRole('heading', { name: 'Terraza' })).toBeInTheDocument();
    expect(
      within(salon as HTMLElement).getByRole('button', { name: 'Mesa 1, Salón, libre' }),
    ).toBeInTheDocument();
    expect(
      within(salon as HTMLElement).getByRole('button', { name: 'Mesa 2, Salón, ocupada' }),
    ).toBeInTheDocument();
    expect(within(mesaDelPlano('Mesa 2, Salón, ocupada')).getByText('2')).toBeInTheDocument();
    expect(within(mesaDelPlano('Mesa 2, Salón, ocupada')).getByText('6 pers.')).toBeInTheDocument();
  });

  it('ubica las mesas en una grilla generada dentro de su zona', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    const izquierda = mesaDelPlano('Mesa 1, Salón, libre').style;
    const derecha = mesaDelPlano('Mesa 2, Salón, ocupada').style;
    expect(izquierda.top).toBe(derecha.top);
    expect(parseFloat(izquierda.left)).toBeLessThan(parseFloat(derecha.left));
    expect(izquierda.left).toMatch(/px$/);
  });

  it('dibuja el contorno del local: entrada con puerta, cocina, barra y terraza con baranda curva', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    const contorno = plano().querySelector('svg') as SVGElement;
    expect(contorno).toHaveAttribute('aria-hidden', 'true');
    expect(within(plano()).getByText('Entrada')).toBeInTheDocument();
    expect(within(plano()).getByText('Cocina')).toBeInTheDocument();
    expect(within(plano()).getByText('Barra')).toBeInTheDocument();
    expect(contorno.querySelectorAll('[data-puerta]').length).toBeGreaterThanOrEqual(1);
    expect(contorno.querySelectorAll('[data-ventana]').length).toBeGreaterThanOrEqual(2);
    expect(contorno.querySelector('[data-baranda]')?.getAttribute('d')).toMatch(/ A /);
  });

  it('con un sector dibuja solo ese ambiente', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: '2' } });

    expect(screen.queryByRole('heading', { name: 'Salón' })).not.toBeInTheDocument();
    expect(within(plano()).queryByText('Cocina')).not.toBeInTheDocument();
    expect(plano().querySelector('[data-baranda]')).not.toBeNull();
  });

  it('da forma a la mesa y la cantidad de sillas según la capacidad', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    const casos: [string, string, number][] = [
      ['Mesa 1, Salón, libre', 'redonda', 2],
      ['Mesa 5, Terraza, libre', 'cuadrada', 4],
      ['Mesa 2, Salón, ocupada', 'rectangular', 6],
      ['Mesa 4, Terraza, fuera de servicio', 'larga', 8],
    ];
    for (const [nombre, forma, sillas] of casos) {
      const elemento = mesaDelPlano(nombre);
      expect(elemento.querySelector(`[data-forma="${forma}"]`)).not.toBeNull();
      expect(elemento.querySelectorAll('[data-silla]')).toHaveLength(sillas);
    }
  });

  it('pinta cada estado y muestra la hora de la reserva sobre la mesa', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    const forma = (nombre: string) => mesaDelPlano(nombre).querySelector('[data-forma]');
    expect(forma('Mesa 1, Salón, libre')).toHaveClass('bg-gray-200', 'border-gray-400');
    expect(forma('Mesa 2, Salón, ocupada')).toHaveClass('bg-red-100', 'border-red-400');
    expect(forma('Mesa 3, Terraza, libre con reserva a las 20:30')).toHaveClass(
      'border-[3px]',
      'border-green-400',
    );
    expect(forma('Mesa 4, Terraza, fuera de servicio')).toHaveClass('border-dashed');
    expect(
      within(mesaDelPlano('Mesa 3, Terraza, libre con reserva a las 20:30')).getByText('20:30'),
    ).toBeInTheDocument();
  });

  it('al hacer clic en una mesa la marca y abre su detalle; al cerrar se desmarca', async () => {
    vi.mocked(api.obtenerComandaAbierta).mockReturnValue(new Promise(() => undefined));
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    fireEvent.click(mesaDelPlano('Mesa 2, Salón, ocupada'));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: 'Mesa 2' })).toBeInTheDocument();
    expect(dialogo).toHaveTextContent('Salón · 6 personas');
    expect(mesaDelPlano('Mesa 2, Salón, ocupada')).toHaveAttribute('data-seleccionada', 'true');
    expect(api.obtenerComandaAbierta).toHaveBeenCalledWith(2);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mesaDelPlano('Mesa 2, Salón, ocupada')).toHaveAttribute('data-seleccionada', 'false');
  });

  it('muestra la leyenda de estados', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    const leyenda = screen.getByRole('list', { name: 'Leyenda del plano' });
    for (const texto of ['Libre', 'Ocupada', 'Con reserva', 'Fuera de servicio']) {
      expect(within(leyenda).getByText(texto)).toBeInTheDocument();
    }
  });

  it('muestra las cantidades por estado', async () => {
    render(<MapaDelLocal />);

    await screen.findByRole('heading', { name: 'Salón' });
    expect(pestana(/^Libres/)).toHaveTextContent('Libres (3)');
    expect(pestana(/^Con reserva/)).toHaveTextContent('Con reserva (1)');
    expect(pestana(/^Ocupadas/)).toHaveTextContent('Ocupadas (1)');
    expect(pestana(/^Fuera de servicio/)).toHaveTextContent('Fuera de servicio (1)');
  });

  it('filtra por estado atenuando las mesas que no cumplen, sin ocultarlas', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    fireEvent.click(pestana(/^Fuera de servicio/));

    expect(mesaDelPlano('Mesa 4, Terraza, fuera de servicio')).not.toHaveClass('opacity-25');
    expect(mesaDelPlano('Mesa 1, Salón, libre')).toHaveClass('opacity-25');
    expect(screen.getByRole('heading', { name: 'Salón' })).toBeInTheDocument();
  });

  it('el plano es compacto con todos los sectores y más grande con uno solo', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    expect(plano()).toHaveAttribute('data-compacto', 'true');
    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: '2' } });
    expect(plano()).toHaveAttribute('data-compacto', 'false');
  });

  it('filtra por sector y recalcula las cantidades', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: '1' } });

    expect(screen.queryByRole('heading', { name: 'Terraza' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Mesa 3,/ })).not.toBeInTheDocument();
    expect(mesaDelPlano('Mesa 1, Salón, libre')).toBeInTheDocument();
    expect(pestana(/^Libres/)).toHaveTextContent('Libres (1)');
    expect(pestana(/^Con reserva/)).toHaveTextContent('Con reserva (0)');
  });

  it('combinar un sector sin ocupadas con «Ocupadas» ofrece quitar el filtro', async () => {
    render(<MapaDelLocal />);
    await screen.findByRole('heading', { name: 'Salón' });

    fireEvent.change(screen.getByLabelText('Sector'), { target: { value: '2' } });
    fireEvent.click(pestana(/^Ocupadas/));

    expect(screen.getByText('No hay mesas con ese filtro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro' }));
    expect(mesaDelPlano('Mesa 5, Terraza, libre')).not.toHaveClass('opacity-25');
    expect(mesaDelPlano('Mesa 1, Salón, libre')).toBeInTheDocument();
  });

  it('sin mesas muestra «No hay mesas registradas» y las cantidades en 0', async () => {
    vi.mocked(api.obtenerMapaDelLocal).mockResolvedValue({ exito: true, datos: [] });

    render(<MapaDelLocal />);

    expect(await screen.findByText('No hay mesas registradas')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Plano del local' })).not.toBeInTheDocument();
    expect(pestana(/^Libres/)).toHaveTextContent('Libres (0)');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ante un error muestra el detalle con «Reintentar», que recarga el mapa', async () => {
    vi.mocked(api.obtenerMapaDelLocal)
      .mockResolvedValueOnce({ exito: false, datos: null, error: 'Falla del backend' })
      .mockResolvedValueOnce({ exito: true, datos: MAPA });

    render(<MapaDelLocal />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falla del backend');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Salón' })).toBeInTheDocument();
    expect(api.obtenerMapaDelLocal).toHaveBeenCalledTimes(2);
  });
});
