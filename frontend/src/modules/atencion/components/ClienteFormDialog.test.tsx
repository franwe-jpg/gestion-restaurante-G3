import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { modificarCliente } from '../api';
import type { Cliente } from '../types';
import { ClienteFormDialog } from './ClienteFormDialog';

vi.mock('../api');
afterEach(() => vi.resetAllMocks());

const CLIENTE: Cliente = { id: 7, nombre: 'Ana López', telefono: '+54 123' };

function abrir(onGuardado = vi.fn()) {
  render(<ClienteFormDialog cliente={CLIENTE} onGuardado={onGuardado} onOpenChange={vi.fn()} />);
  return onGuardado;
}

describe('ClienteFormDialog', () => {
  it('guarda ambos datos y entrega el registro actualizado (#49 CA1)', async () => {
    const actualizado = { ...CLIENTE, nombre: 'María Ruiz', telefono: '456-789' };
    vi.mocked(modificarCliente).mockResolvedValue({ exito: true, datos: actualizado });
    const onGuardado = abrir();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'María Ruiz' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '456-789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(modificarCliente).toHaveBeenCalledWith(7, {
        nombre: 'María Ruiz',
        telefono: '456-789',
      }),
    );
    expect(onGuardado).toHaveBeenCalledWith(actualizado);
  });

  it.each(['Ana2', 'Ana!'])(
    'rechaza nombre inválido %s sin llamar a la API (#49 CA2)',
    (nombre) => {
      abrir();
      fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: nombre } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
      expect(screen.getByRole('alert')).toHaveTextContent('solo letras');
      expect(modificarCliente).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Teléfono/)).toHaveValue('+54 123');
    },
  );
});

describe('ClienteFormDialog: errores', () => {
  it.each(['12a3', '12+34'])(
    'rechaza teléfono con formato inválido %s sin modificar el cliente (#49 CA3)',
    (telefono) => {
      vi.mocked(modificarCliente).mockResolvedValue({
        exito: false,
        datos: null,
        error: 'Teléfono inválido',
      });
      const onGuardado = abrir();
      fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'María Ruiz' } });
      fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: telefono } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(screen.getByRole('alert')).toHaveTextContent('teléfono');
      expect(modificarCliente).not.toHaveBeenCalled();
      expect(onGuardado).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Nombre/)).toHaveValue('María Ruiz');
      expect(screen.getByLabelText(/Teléfono/)).toHaveValue(telefono);
    },
  );

  it.each(['nombre', 'telefono'] as const)(
    'rechaza %s vacío y conserva el otro valor (#49 CA4)',
    (campo) => {
      abrir();
      fireEvent.change(screen.getByLabelText(campo === 'nombre' ? /Nombre/ : /Teléfono/), {
        target: { value: ' ' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
      expect(screen.getByRole('alert')).toHaveTextContent('obligatorio');
      expect(modificarCliente).not.toHaveBeenCalled();
      expect(screen.getByLabelText(campo === 'nombre' ? /Teléfono/ : /Nombre/)).toHaveValue(
        campo === 'nombre' ? '+54 123' : 'Ana López',
      );
    },
  );

  it('muestra el error del servidor y deja los valores disponibles para corregir', async () => {
    vi.mocked(modificarCliente).mockResolvedValue({
      exito: false,
      datos: null,
      error: 'Cliente no encontrado',
    });
    const onGuardado = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cliente no encontrado');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Ana López');
    expect(onGuardado).not.toHaveBeenCalled();
  });
});
