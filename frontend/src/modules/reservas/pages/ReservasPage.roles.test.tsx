import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usarRoles } from '../../../test/sesionDePrueba';
import { buscarClientes, listarClientes, listarMesasDisponibles, listarReservas } from '../api';
import type { Reserva } from '../types';

import { ReservasPage } from './ReservasPage';

vi.mock('../api');

const RESERVA: Reserva = {
  id: 1,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-02',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

function abrirEn(ruta = '/reservas') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <ReservasPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listarReservas).mockResolvedValue({
    datos: { items: [RESERVA], total: 1, limit: 50, offset: 0 },
    exito: true,
  });
});

describe('Reservas: según el rol', () => {
  it.each([['ENCARGADO'], ['MOZO']] as const)(
    'el %s ve «Nueva reserva» y las acciones de fila',
    async (rol) => {
      usarRoles([rol]);
      abrirEn();

      expect(await screen.findByText('Mesa n.º 5')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Nueva reserva' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Crear comanda' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Modificar reserva' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar reserva' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar por ausencia' })).toBeInTheDocument();
    },
  );

  it('el chef ve el listado sin crear, modificar, cancelar ni abrir comanda', async () => {
    usarRoles(['CHEF']);
    abrirEn();

    expect(await screen.findByText('Mesa n.º 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear comanda' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modificar reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
  });

  it('el chef no consulta clientes ni mesas disponibles (evita el 403)', async () => {
    usarRoles(['CHEF']);
    abrirEn();

    await screen.findByText('Mesa n.º 5');
    expect(buscarClientes).not.toHaveBeenCalled();
    expect(listarClientes).not.toHaveBeenCalled();
    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });

  it('?nueva=1 no abre el alta para el chef', async () => {
    usarRoles(['CHEF']);
    abrirEn('/reservas?nueva=1');

    await screen.findByText('Mesa n.º 5');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(buscarClientes).not.toHaveBeenCalled();
    expect(listarClientes).not.toHaveBeenCalled();
  });
});
