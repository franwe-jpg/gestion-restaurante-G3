import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { crearMedioPago, modificarMedioPago } from '../api';
import type { MedioPago } from '../types';

import { MedioPagoFormDialog } from './MedioPagoFormDialog';

vi.mock('../api');

const TARJETA: MedioPago = {
  id: 4,
  nombre: 'Tarjeta',
  tipo: 'TARJETA',
  descripcion: 'Visa',
  estado: 'HABILITADO',
};

function abrir(medioPago: MedioPago | null = null) {
  const onGuardado = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <MedioPagoFormDialog
        medioPago={medioPago}
        onGuardado={onGuardado}
        onOpenChange={onOpenChange}
      />
    </ToastProvider>,
  );
  return { onGuardado, onOpenChange };
}

function escribir(etiqueta: RegExp, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('MedioPagoFormDialog: alta (HU-M6-04)', () => {
  it('muestra los campos de la maqueta y el estado fijo Habilitado (CA 8)', () => {
    abrir();

    expect(screen.getByText('Nuevo medio de pago')).toBeInTheDocument();
    expect(screen.getByText('De 3 a 50 caracteres. No se puede repetir.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Billetera virtual' })).toBeInTheDocument();
    expect(screen.getByText(/Estado: Habilitado/)).toBeInTheDocument();
  });

  it('con datos vacíos no envía y avisa nombre y tipo obligatorios (CA 3 y CA 6)', () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El tipo es obligatorio.')).toBeInTheDocument();
    expect(crearMedioPago).not.toHaveBeenCalled();
  });

  it('envía nombre, tipo y descripción recortados (CA 1)', async () => {
    vi.mocked(crearMedioPago).mockResolvedValue({ datos: TARJETA, exito: true });
    const { onGuardado } = abrir();

    escribir(/Nombre/, '  Efectivo ');
    escribir(/Tipo/, 'EFECTIVO');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(crearMedioPago).toHaveBeenCalledWith({
      nombre: 'Efectivo',
      tipo: 'EFECTIVO',
      descripcion: null,
    });
  });

  it('muestra el nombre repetido bajo el campo Nombre (CA 2)', async () => {
    vi.mocked(crearMedioPago).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El medio de pago ya existe',
    });
    abrir();

    escribir(/Nombre/, 'Efectivo');
    escribir(/Tipo/, 'EFECTIVO');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El medio de pago ya existe')).toBeInTheDocument();
  });
});

describe('MedioPagoFormDialog: edición (HU-M6-05)', () => {
  it('precarga los datos y envía el estado elegido (CA 1 y CA 9)', async () => {
    vi.mocked(modificarMedioPago).mockResolvedValue({ datos: TARJETA, exito: true });
    const { onGuardado } = abrir(TARJETA);

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Tarjeta');
    fireEvent.click(screen.getByLabelText('Habilitado'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    expect(modificarMedioPago).toHaveBeenCalledWith(4, {
      nombre: 'Tarjeta',
      tipo: 'TARJETA',
      descripcion: 'Visa',
      estado: 'DESHABILITADO',
    });
  });

  it('cancelar cierra sin llamar a la API (CA 10)', () => {
    const { onOpenChange } = abrir(TARJETA);

    escribir(/Nombre/, 'Otro nombre');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(modificarMedioPago).not.toHaveBeenCalled();
  });

  it('informa como error general que el medio ya no existe (CA 11)', async () => {
    vi.mocked(modificarMedioPago).mockResolvedValue({
      datos: null,
      exito: false,
      error: 'El medio de pago 4 no existe',
    });
    abrir(TARJETA);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El medio de pago 4 no existe')).toBeInTheDocument();
  });
});
