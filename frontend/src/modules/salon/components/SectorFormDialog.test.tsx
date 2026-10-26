import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearSector } from '../api';
import type { Sector } from '../types';

import { SectorFormDialog } from './SectorFormDialog';

vi.mock('../api');

const CREADO: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: null,
  estado: 'HABILITADO',
};

function abrir() {
  const onCreado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <SectorFormDialog onCreado={onCreado} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return { onCreado, onOpenChange };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('SectorFormDialog: campos y estado', () => {
  it('muestra Nombre y Descripción, y el estado fijo Habilitado (CA 6)', () => {
    abrir();

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('');
    expect(screen.getByText(/Estado: Habilitado/)).toBeInTheDocument();
  });

  it('con los campos vacíos no envía y marca el nombre (CA 2)', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(crearSector).not.toHaveBeenCalled();
  });

  it('con 31 caracteres advierte el máximo sin enviar (CA 5)', () => {
    abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'a'.repeat(31) } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('El nombre supera los 30 caracteres permitidos.')).toBeInTheDocument();
    expect(crearSector).not.toHaveBeenCalled();
  });
});

describe('SectorFormDialog: alta', () => {
  it('crea el sector y avisa a quien lo abrió (CA 1)', async () => {
    vi.mocked(crearSector).mockResolvedValue({ datos: CREADO, exito: true });
    const { onCreado } = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '  Salón principal ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onCreado).toHaveBeenCalledTimes(1));
    expect(crearSector).toHaveBeenCalledWith({
      nombre: 'Salón principal',
      descripcion: null,
    });
    expect(await screen.findByText('Sector creado')).toBeInTheDocument();
  });

  it('envía la descripción cuando se carga (CA 1)', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: { ...CREADO, nombre: 'Terraza', descripcion: 'Al aire libre' },
      exito: true,
    });
    abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza' } });
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Al aire libre' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(crearSector).toHaveBeenCalledWith({
        nombre: 'Terraza',
        descripcion: 'Al aire libre',
      }),
    );
  });
});

describe('SectorFormDialog: cancelar y errores', () => {
  it('al cancelar cierra sin enviar ninguna solicitud (CA 4)', () => {
    const { onOpenChange } = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearSector).not.toHaveBeenCalled();
  });

  it('muestra el 409 bajo Nombre y conserva lo escrito (CA 3)', async () => {
    vi.mocked(crearSector).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El sector ya existe',
    });
    const { onCreado } = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Salón principal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Salón principal');
    expect(onCreado).not.toHaveBeenCalled();
  });
});
