import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearMesa, listarSectoresHabilitados, modificarMesa } from '../api';
import type { Mesa, Sector } from '../types';

import { MesaFormDialog } from './MesaFormDialog';

vi.mock('../api');

const SECTORES: Sector[] = [
  { id: 1, nombre: 'Salón principal', descripcion: null, estado: 'HABILITADO' },
  { id: 2, nombre: 'Terraza', descripcion: null, estado: 'HABILITADO' },
];

const DESHABILITADO: Sector = {
  id: 3,
  nombre: 'Reservado',
  descripcion: null,
  estado: 'DESHABILITADO',
};

const CREADA: Mesa = {
  id: 1,
  numero: 13,
  capacidad: 4,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};

interface OpcionesDialogo {
  sectores?: Sector[];
  mesa?: Mesa | null;
}

async function abrir({ sectores = SECTORES, mesa = null }: OpcionesDialogo = {}) {
  vi.mocked(listarSectoresHabilitados).mockResolvedValue({
    datos: { items: sectores, total: sectores.length, limit: 100, offset: 0 },
    exito: true,
  });
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  const onCrearSector = vi.fn();
  render(
    <ToastProvider>
      <MesaFormDialog
        mesa={mesa}
        onGuardado={onGuardado}
        onOpenChange={onOpenChange}
        onCrearSector={onCrearSector}
      />
    </ToastProvider>,
  );
  await screen.findByLabelText(/Número/);
  return { onGuardado, onOpenChange, onCrearSector };
}

function completar(numero = '13', capacidad = '4', sectorId = '1') {
  fireEvent.change(screen.getByLabelText(/Número/), { target: { value: numero } });
  fireEvent.change(screen.getByLabelText(/Capacidad/), { target: { value: capacidad } });
  fireEvent.change(screen.getByLabelText(/Sector/), { target: { value: sectorId } });
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mesa' }));
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('MesaFormDialog: campos y estado', () => {
  it('muestra Sector, Número y Capacidad, el aviso de estado y solo sectores habilitados (CA 7)', async () => {
    await abrir({ sectores: [...SECTORES, DESHABILITADO] });

    expect(screen.getByLabelText(/Sector/)).toHaveValue('');
    expect(screen.getByLabelText(/Número/)).toHaveValue('');
    expect(screen.getByLabelText(/Capacidad/)).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Salón principal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Terraza' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Reservado' })).toBeNull();
    expect(screen.getByText(/La mesa se crea en estado/)).toBeInTheDocument();
    expect(screen.getByText('Libre')).toBeInTheDocument();
  });

  it('con los campos vacíos no envía y marca los obligatorios (CA 2)', async () => {
    await abrir();

    guardar();

    expect(screen.getByText('El número es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La capacidad es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('El sector es obligatorio.')).toBeInTheDocument();
    expect(crearMesa).not.toHaveBeenCalled();
  });

  it('con un número inválido advierte y no envía (CA 5)', async () => {
    await abrir();
    completar('0', '4', '1');

    guardar();

    expect(
      screen.getByText('El número debe ser un número entero mayor a cero.'),
    ).toBeInTheDocument();
    expect(crearMesa).not.toHaveBeenCalled();
  });

  it('con una capacidad inválida advierte y no envía (CA 6)', async () => {
    await abrir();
    completar('13', '4.5', '1');

    guardar();

    expect(
      screen.getByText('La capacidad debe ser un número entero mayor a cero.'),
    ).toBeInTheDocument();
    expect(crearMesa).not.toHaveBeenCalled();
  });
});

describe('MesaFormDialog: alta', () => {
  it('crea la mesa, envía los enteros y avisa a quien lo abrió (CA 1)', async () => {
    vi.mocked(crearMesa).mockResolvedValue({ datos: CREADA, exito: true });
    const { onGuardado } = await abrir();
    completar(' 13 ', ' 4 ', '1');

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearMesa).toHaveBeenCalledWith({ numero: 13, capacidad: 4, sector_id: 1 });
    expect(await screen.findByText('Mesa creada')).toBeInTheDocument();
  });
});

describe('MesaFormDialog: cancelar y errores', () => {
  it('al cancelar cierra sin enviar ninguna solicitud (CA 4)', async () => {
    const { onOpenChange } = await abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearMesa).not.toHaveBeenCalled();
  });

  it('muestra el 409 de número repetido bajo Número y conserva lo escrito (CA 3)', async () => {
    const mensaje = 'La mesa 13 ya existe en el sector Salón principal';
    vi.mocked(crearMesa).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { onGuardado } = await abrir();
    completar();

    guardar();

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número/)).toHaveValue('13');
    expect(screen.getByLabelText(/Capacidad/)).toHaveValue('4');
    expect(screen.getByLabelText(/Sector/)).toHaveValue('1');
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('muestra el 409 de sector deshabilitado bajo Sector', async () => {
    const mensaje = 'El sector Reservado está deshabilitado';
    vi.mocked(crearMesa).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { onGuardado } = await abrir();
    completar();

    guardar();

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
  });
});

describe('MesaFormDialog: sin sectores habilitados', () => {
  it('avisa que primero hay que crear un sector y deshabilita Guardar mesa (CA 2)', async () => {
    const { onCrearSector } = await abrir({ sectores: [] });

    expect(screen.getByText('Primero creá un sector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar mesa' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Crear sector' }));

    expect(onCrearSector).toHaveBeenCalledTimes(1);
    expect(crearMesa).not.toHaveBeenCalled();
  });
});

describe('MesaFormDialog: edición', () => {
  const MESA: Mesa = {
    id: 3,
    numero: 1,
    capacidad: 2,
    sector: { id: 1, nombre: 'Salón principal' },
    estado: 'LIBRE',
  };

  it('precarga los datos y guarda con PUT (CA 1 de #39)', async () => {
    vi.mocked(modificarMesa).mockResolvedValue({ datos: MESA, exito: true });
    const { onGuardado } = await abrir({ mesa: MESA });

    expect(screen.getByRole('heading', { name: 'Editar mesa' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Número/)).toHaveValue('1');
    expect(screen.getByLabelText(/Capacidad/)).toHaveValue('2');
    expect(screen.getByLabelText(/Sector/)).toHaveValue('1');

    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarMesa).toHaveBeenCalledWith(3, { numero: 7, capacidad: 2, sector_id: 1 });
    expect(await screen.findByText('Mesa modificada')).toBeInTheDocument();
  });

  it('con un dato obligatorio vacío no guarda y lo informa (CA 2 de #39)', async () => {
    await abrir({ mesa: MESA });

    fireEvent.change(screen.getByLabelText(/Capacidad/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByText('La capacidad es obligatoria.')).toBeInTheDocument();
    expect(modificarMesa).not.toHaveBeenCalled();
  });

  it('muestra el 409 de número repetido bajo Número (CA 3 de #39)', async () => {
    const mensaje = 'La mesa 2 ya existe en el sector Salón principal';
    vi.mocked(modificarMesa).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    await abrir({ mesa: MESA });

    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número/)).toHaveValue('2');
  });

  it('al cancelar no envía la modificación (CA 4 de #39)', async () => {
    const { onOpenChange } = await abrir({ mesa: MESA });

    fireEvent.change(screen.getByLabelText(/Número/), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(modificarMesa).not.toHaveBeenCalled();
  });
});
