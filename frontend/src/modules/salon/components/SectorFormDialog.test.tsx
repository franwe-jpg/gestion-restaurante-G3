import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearSector, modificarSector } from '../api';
import type { Sector } from '../types';

import { SectorFormDialog } from './SectorFormDialog';

vi.mock('../api');

const CREADO: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: null,
  estado: 'HABILITADO',
};

const TERRAZA: Sector = {
  id: 7,
  nombre: 'Terraza',
  descripcion: 'Al aire libre',
  estado: 'HABILITADO',
};

function abrir(sector: Sector | null = null) {
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <SectorFormDialog sector={sector} onGuardado={onGuardado} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return { onGuardado, onOpenChange };
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
    const { onGuardado } = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '  Salón principal ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
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

describe('SectorFormDialog: edición', () => {
  it('muestra el título, los datos precargados y «Guardar cambios» (CA 1 de #34)', () => {
    abrir(TERRAZA);

    expect(screen.getByRole('heading', { name: 'Editar sector' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Terraza');
    expect(screen.getByLabelText(/Descripción/)).toHaveValue('Al aire libre');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument();
  });

  it('muestra el estado real del sector (M16)', () => {
    abrir({ ...TERRAZA, estado: 'DESHABILITADO' });

    expect(screen.getByText(/Estado: Deshabilitado/)).toBeInTheDocument();
  });

  it('envía la modificación por id y avisa al guardar (CA 1 de #34)', async () => {
    vi.mocked(modificarSector).mockResolvedValue({
      datos: { ...TERRAZA, nombre: 'Terraza norte' },
      exito: true,
    });
    const { onGuardado } = abrir(TERRAZA);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza norte' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarSector).toHaveBeenCalledWith(7, {
      nombre: 'Terraza norte',
      descripcion: 'Al aire libre',
    });
    expect(crearSector).not.toHaveBeenCalled();
    expect(await screen.findByText('Sector modificado')).toBeInTheDocument();
  });

  it('al cancelar cierra sin enviar la modificación (CA 4 de #34)', () => {
    const { onOpenChange } = abrir(TERRAZA);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Terraza norte' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(modificarSector).not.toHaveBeenCalled();
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
    const { onGuardado } = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Salón principal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe un sector con ese nombre.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Salón principal');
    expect(onGuardado).not.toHaveBeenCalled();
  });
});
