import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearChef, modificarChef } from '../api';
import type { Chef } from '../types';

import { ChefFormDialog } from './ChefFormDialog';

vi.mock('../api');

const CREADO: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

function abrir(chef: Chef | null = null) {
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <ChefFormDialog chef={chef} onGuardado={onGuardado} onOpenChange={onOpenChange} />
    </ToastProvider>,
  );
  return { onGuardado, onOpenChange };
}

function completar(contrasena = 'clave-1234') {
  fireEvent.change(screen.getByLabelText(/DNI/), { target: { value: '28111222' } });
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Marta' } });
  fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: 'Gómez' } });
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'marta@resto.com' } });
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: contrasena } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('ChefFormDialog: alta', () => {
  it('abre «Nuevo chef» con DNI, nombre, apellido, teléfono, correo y contraseña', () => {
    abrir();

    expect(screen.getByRole('heading', { name: 'Nuevo chef' })).toBeInTheDocument();
    expect(screen.getByLabelText(/DNI/)).toHaveValue('');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('');
    expect(screen.getByLabelText(/Correo/)).toHaveValue('');
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('type', 'password');
    expect(screen.getByText(/El chef se crea en estado/)).toBeInTheDocument();
  });

  it('crea el chef, cierra por onGuardado y avisa «Chef creado»', async () => {
    vi.mocked(crearChef).mockResolvedValue({ datos: CREADO, exito: true });
    const { onGuardado } = abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar chef' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearChef).toHaveBeenCalledWith({
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: null,
      correo: 'marta@resto.com',
      contrasena: 'clave-1234',
    });
    expect(await screen.findByText('Chef creado')).toBeInTheDocument();
  });

  it('sin contraseña informa «La contraseña es obligatoria.» y no envía', () => {
    abrir();
    completar('');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar chef' }));

    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(crearChef).not.toHaveBeenCalled();
  });
});

describe('ChefFormDialog: errores y cancelar', () => {
  it('el 409 de correo repetido se muestra bajo Correo y el diálogo sigue abierto', async () => {
    const mensaje = 'Ya existe un usuario con el correo marta@resto.com';
    vi.mocked(crearChef).mockResolvedValue({ datos: null, exito: false, error: mensaje });
    const { onGuardado } = abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar chef' }));

    expect(await screen.findByText(mensaje)).toHaveAttribute('id', 'chef-correo-error');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it('«Cancelar» cierra sin enviar ninguna solicitud', () => {
    const { onOpenChange } = abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(crearChef).not.toHaveBeenCalled();
  });
});

describe('ChefFormDialog: edición', () => {
  it('abre «Editar chef» y acepta la contraseña vacía (conserva la actual)', async () => {
    vi.mocked(modificarChef).mockResolvedValue({ datos: CREADO, exito: true });
    const { onGuardado } = abrir(CREADO);

    expect(screen.getByRole('heading', { name: 'Editar chef' })).toBeInTheDocument();
    expect(screen.getByText(/vacía para conservar la actual/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarChef).toHaveBeenCalledWith(4, {
      dni: '28111222',
      nombre: 'Marta',
      apellido: 'Gómez',
      telefono: null,
      correo: 'marta@resto.com',
    });
  });
});
