import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearMozo, modificarMozo } from '../api';
import type { Mozo } from '../types';

import { MozoFormDialog } from './MozoFormDialog';

vi.mock('../api');

const CREADO: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: '280 412-3456',
  estado: 'HABILITADO',
};

function abrir(mozo: Mozo | null = null) {
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <MozoFormDialog mozo={mozo} onGuardado={onGuardado} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return { onGuardado, onOpenChange };
}

function completar(
  dni = '30123456',
  nombre = 'Juan',
  apellido = 'Fernández',
  telefono = '280 412-3456',
) {
  fireEvent.change(screen.getByLabelText(/DNI/), { target: { value: dni } });
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: apellido } });
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: telefono } });
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mozo' }));
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('MozoFormDialog: campos y estado', () => {
  it('muestra DNI, Nombre, Apellido y Teléfono, y el aviso de estado (CA 7 de #43)', () => {
    abrir();

    expect(screen.getByLabelText(/DNI/)).toHaveValue('');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Apellido/)).toHaveValue('');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('');
    expect(screen.getByText(/El mozo se crea en estado/)).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
  });

  it('con los campos obligatorios vacíos no envía y los marca (CA 2 de #43)', () => {
    abrir();

    guardar();

    expect(screen.getByText('El DNI es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument();
    expect(crearMozo).not.toHaveBeenCalled();
  });

  it('con un DNI inválido advierte y no envía (CA 5 de #43)', () => {
    abrir();
    completar('301234');

    guardar();

    expect(screen.getByText('El DNI debe tener 7 u 8 dígitos.')).toBeInTheDocument();
    expect(crearMozo).not.toHaveBeenCalled();
  });

  it('con un nombre con números advierte y no envía (CA 6 de #43)', () => {
    abrir();
    completar('30123456', 'Juan123');

    guardar();

    expect(screen.getByText('El nombre solo debe contener letras.')).toBeInTheDocument();
    expect(crearMozo).not.toHaveBeenCalled();
  });
});

describe('MozoFormDialog: alta', () => {
  it('crea el mozo, avisa a quien lo abrió y muestra el toast (CA 1 de #43)', async () => {
    vi.mocked(crearMozo).mockResolvedValue({ datos: CREADO, exito: true });
    const { onGuardado } = abrir();
    completar();

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearMozo).toHaveBeenCalledWith({
      dni: '30123456',
      nombre: 'Juan',
      apellido: 'Fernández',
      telefono: '280 412-3456',
    });
    expect(await screen.findByText('Mozo creado')).toBeInTheDocument();
  });
});

describe('MozoFormDialog: cancelar y errores', () => {
  it('al cancelar cierra sin enviar ninguna solicitud (CA 4 de #43)', () => {
    const { onOpenChange } = abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearMozo).not.toHaveBeenCalled();
  });

  it('muestra el 409 de DNI repetido bajo DNI y conserva lo escrito (CA 3 de #43)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(crearMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { onGuardado } = abrir();
    completar();

    guardar();

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByLabelText(/DNI/)).toHaveValue('30123456');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Juan');
    expect(onGuardado).not.toHaveBeenCalled();
  });
});

describe('MozoFormDialog: edición', () => {
  const MOZO: Mozo = {
    id: 3,
    dni: '35987654',
    nombre: 'Ana',
    apellido: 'Romero',
    telefono: null,
    estado: 'HABILITADO',
  };

  it('precarga los datos y guarda con PUT (CA 1 de #44)', async () => {
    vi.mocked(modificarMozo).mockResolvedValue({ datos: MOZO, exito: true });
    const { onGuardado } = abrir(MOZO);

    expect(screen.getByRole('heading', { name: 'Editar mozo' })).toBeInTheDocument();
    expect(screen.getByLabelText(/DNI/)).toHaveValue('35987654');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Ana');

    fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: 'Gómez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarMozo).toHaveBeenCalledWith(3, {
      dni: '35987654',
      nombre: 'Ana',
      apellido: 'Gómez',
      telefono: null,
    });
    expect(await screen.findByText('Mozo modificado')).toBeInTheDocument();
  });

  it('con un dato obligatorio vacío no guarda y lo informa (CA 2 de #44)', () => {
    abrir(MOZO);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(modificarMozo).not.toHaveBeenCalled();
  });

  it('muestra el 409 de DNI repetido bajo DNI (CA 3 de #44)', async () => {
    const mensaje = 'Ya existe un mozo con el DNI 30123456';
    vi.mocked(modificarMozo).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    abrir(MOZO);

    fireEvent.change(screen.getByLabelText(/DNI/), { target: { value: '30123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByLabelText(/DNI/)).toHaveValue('30123456');
  });

  it('al cancelar no envía la modificación (CA 4 de #44)', () => {
    const { onOpenChange } = abrir(MOZO);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Ana María' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(modificarMozo).not.toHaveBeenCalled();
  });
});
