import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './api';
import { DetalleDeMesaDialog } from './DetalleDeMesaDialog';
import type { ComandaDeMesa, MesaDelMapa } from './types';

vi.mock('./api', () => ({
  obtenerComandaAbierta: vi.fn(),
  obtenerCliente: vi.fn(),
}));

function mesa(estadoVisible: MesaDelMapa['estadoVisible']): MesaDelMapa {
  const conReserva = estadoVisible === 'RESERVADA';
  return {
    id: 2,
    numero: 5,
    capacidad: 6,
    sector: { id: 1, nombre: 'Salón principal' },
    estado: conReserva ? 'LIBRE' : estadoVisible,
    estadoVisible,
    horaReserva: conReserva ? '21:30' : undefined,
    reserva: conReserva
      ? { id: 9, mesa_id: 2, cliente_id: 7, hora: '21:30', cantidad_personas: 5 }
      : undefined,
  };
}

const COMANDA: ComandaDeMesa = {
  id: 128,
  fechaHora: '2026-11-09T23:15:00Z',
  lineas: [
    { cantidad: 2, nombre: 'Milanesa napolitana', importe: 25000, entregado: true },
    { cantidad: 1, nombre: 'Flan casero', importe: 4200, entregado: false },
  ],
  total: 29200,
  unidades: 3,
  unidadesEntregadas: 2,
};

function abrir(estado: MesaDelMapa['estadoVisible'], onCerrar = vi.fn()) {
  render(
    <MemoryRouter>
      <DetalleDeMesaDialog mesa={mesa(estado)} onCerrar={onCerrar} />
    </MemoryRouter>,
  );
  return screen.getByRole('dialog');
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.obtenerComandaAbierta).mockResolvedValue({ exito: true, datos: COMANDA });
  vi.mocked(api.obtenerCliente).mockResolvedValue({
    exito: true,
    datos: { id: 7, nombre: 'María Pérez', telefono: '2804000000' },
  });
});

describe('DetalleDeMesaDialog', () => {
  it('sin mesa no muestra nada', () => {
    render(<DetalleDeMesaDialog mesa={null} onCerrar={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra «Mesa N», «Sector · N personas» y se cierra', () => {
    const onCerrar = vi.fn();
    const dialogo = abrir('FUERA_DE_SERVICIO', onCerrar);

    expect(within(dialogo).getByRole('heading', { name: 'Mesa 5' })).toBeInTheDocument();
    expect(dialogo).toHaveTextContent('Salón principal · 6 personas');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar modal' }));
    expect(onCerrar).toHaveBeenCalled();
  });

  it('ocupada: carga la comanda abierta con sus líneas, total y «Ver comanda»', async () => {
    const dialogo = abrir('OCUPADA');

    expect(within(dialogo).getByRole('status')).toHaveTextContent('Cargando');
    expect(await within(dialogo).findByText('N° 128')).toBeInTheDocument();
    expect(api.obtenerComandaAbierta).toHaveBeenCalledWith(2);
    expect(dialogo).toHaveTextContent('Ocupada');
    expect(dialogo).toHaveTextContent('2× Milanesa napolitana');
    expect(dialogo).toHaveTextContent('Entregado');
    expect(dialogo).toHaveTextContent('1× Flan casero');
    expect(dialogo).toHaveTextContent('Pendiente');
    expect(dialogo).toHaveTextContent('2 de 3');
    expect(within(dialogo).getByText('Total a pagar').parentElement).toHaveTextContent('29.200');
    expect(within(dialogo).getByRole('link', { name: 'Ver comanda' })).toHaveAttribute(
      'href',
      '/atencion',
    );
  });

  it('ocupada sin comanda abierta lo avisa', async () => {
    vi.mocked(api.obtenerComandaAbierta).mockResolvedValue({ exito: true, datos: null });

    const dialogo = abrir('OCUPADA');

    expect(
      await within(dialogo).findByText('No se encontró una comanda abierta para esta mesa.'),
    ).toBeInTheDocument();
  });

  it('ocupada con error muestra el detalle y «Reintentar» vuelve a pedir', async () => {
    vi.mocked(api.obtenerComandaAbierta)
      .mockResolvedValueOnce({ exito: false, datos: null, error: 'Falla del backend' })
      .mockResolvedValueOnce({ exito: true, datos: COMANDA });

    const dialogo = abrir('OCUPADA');

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Falla del backend');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reintentar' }));
    expect(await within(dialogo).findByText('N° 128')).toBeInTheDocument();
  });

  it('con reserva: hora, cliente y personas, y se puede usar mientras tanto', async () => {
    const dialogo = abrir('RESERVADA');

    expect(dialogo).toHaveTextContent('Reservada hoy a las 21:30');
    expect(await within(dialogo).findByText(/María Pérez/)).toHaveTextContent(
      'María Pérez · 5 personas',
    );
    expect(api.obtenerCliente).toHaveBeenCalledWith(7);
    expect(dialogo).toHaveTextContent('Mientras tanto la mesa se puede usar.');
    expect(within(dialogo).getByRole('link', { name: 'Nueva comanda' })).toHaveAttribute(
      'href',
      '/atencion?nueva=1',
    );
  });

  it('con reserva: si el cliente no aparece usa «Cliente n.º N»; si falla, permite reintentar', async () => {
    vi.mocked(api.obtenerCliente)
      .mockResolvedValueOnce({ exito: false, datos: null, error: 'Sin conexión' })
      .mockResolvedValueOnce({ exito: true, datos: null });

    const dialogo = abrir('RESERVADA');

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Sin conexión');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reintentar' }));
    expect(await within(dialogo).findByText(/Cliente n\.º 7/)).toHaveTextContent(
      'Cliente n.º 7 · 5 personas',
    );
  });

  it('libre: lo dice y ofrece «Nueva comanda»', () => {
    const dialogo = abrir('LIBRE');

    expect(dialogo).toHaveTextContent('La mesa está libre y no tiene una comanda abierta.');
    expect(within(dialogo).getByRole('link', { name: 'Nueva comanda' })).toHaveAttribute(
      'href',
      '/atencion?nueva=1',
    );
    expect(api.obtenerComandaAbierta).not.toHaveBeenCalled();
  });

  it('fuera de servicio: indica dónde se habilita', () => {
    const dialogo = abrir('FUERA_DE_SERVICIO');

    expect(dialogo).toHaveTextContent(
      'La mesa está fuera de servicio. Se habilita desde Salón y Mozos.',
    );
  });
});
