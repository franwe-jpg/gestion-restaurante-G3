import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listarClientes, modificarCliente } from '../api';
import type { Cliente } from '../types';
import { AtencionPage } from './AtencionPage';

vi.mock('../api');
afterEach(() => vi.resetAllMocks());

const CLIENTES: Cliente[] = [
  { id: 1, nombre: 'Ana López', telefono: '+54 123' },
  { id: 2, nombre: 'Ana Ruiz', telefono: '+54 123' },
];

function responder(items: Cliente[], total = items.length, offset = 0) {
  vi.mocked(listarClientes).mockResolvedValue({
    exito: true,
    datos: { items, total, limit: 50, offset },
  });
}

describe('AtencionPage', () => {
  it('muestra los datos de contacto, el total y permite avanzar de página (#50 CA1)', async () => {
    responder(CLIENTES, 52);
    render(<AtencionPage />);
    expect(await screen.findByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getAllByText('+54 123')).toHaveLength(2);
    expect(screen.getByText(/52 clientes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(listarClientes).toHaveBeenCalledWith('', 50, 50));
  });

  it.each(['Ana López', 'Ana', '+54 123'])(
    'busca por nombre o teléfono: %s (#50 CA2-CA3)',
    async (q) => {
      responder(CLIENTES);
      render(<AtencionPage />);
      await screen.findByText('Ana López');
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), {
        target: { value: q },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
      await waitFor(() => expect(listarClientes).toHaveBeenCalledWith(q, 50, 0));
      expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    },
  );

  it('distingue búsqueda sin coincidencias de registro vacío (#50 CA4-CA5)', async () => {
    responder([]);
    render(<AtencionPage />);
    expect(await screen.findByText('No hay clientes registrados')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), {
      target: { value: 'Inexistente' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('No se encontraron clientes')).toBeInTheDocument();
  });
});

describe('AtencionPage: estados y edición', () => {
  it('una página fuera de rango no se presenta como registro vacío', async () => {
    responder(CLIENTES, 51);
    render(<AtencionPage />);
    await screen.findByText('Ana López');
    vi.mocked(listarClientes).mockResolvedValue({
      exito: true,
      datos: { items: [], total: 51, limit: 50, offset: 50 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(await screen.findByText('No hay clientes en esta página')).toBeInTheDocument();
    expect(screen.queryByText('No hay clientes registrados')).toBeNull();
  });

  it('informa errores sin presentar la lista como vacía', async () => {
    vi.mocked(listarClientes).mockResolvedValue({
      exito: false,
      datos: null,
      error: 'Sin conexión',
    });
    render(<AtencionPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('permite editar un cliente y muestra los datos confirmados en el listado (#49 CA1)', async () => {
    responder(CLIENTES);
    vi.mocked(modificarCliente).mockResolvedValue({
      exito: true,
      datos: { id: 1, nombre: 'María Ruiz', telefono: '456-789' },
    });
    render(<AtencionPage />);
    await screen.findByText('Ana López');
    fireEvent.click(screen.getByRole('button', { name: 'Modificar Ana López' }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'María Ruiz' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '456-789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('María Ruiz')).toBeInTheDocument();
    expect(screen.getByText('456-789')).toBeInTheDocument();
    expect(screen.queryByText('Ana López')).toBeNull();
  });
});
