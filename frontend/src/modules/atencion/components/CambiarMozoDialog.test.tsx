import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as api from '../api';
import { CambiarMozoDialog } from './CambiarMozoDialog';

vi.mock('../api', () => ({
  asignarMozoComanda: vi.fn(),
  listarMozosHabilitados: vi.fn(),
}));

const LUCIA = { id: 31, nombre: 'Lucía', apellido: 'Fernández', estado: 'HABILITADO' as const };
const PEDRO = { id: 33, nombre: 'Pedro', apellido: 'Ruiz', estado: 'HABILITADO' as const };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.listarMozosHabilitados).mockResolvedValue({ exito: true, datos: [LUCIA, PEDRO] });
});

function abrir(mozoActual: typeof LUCIA | null, onCambiado = vi.fn(), onSalir = vi.fn()) {
  render(
    <CambiarMozoDialog
      comandaId={3}
      mozoActual={mozoActual}
      onSalir={onSalir}
      onCambiado={onCambiado}
    />,
  );
  return { onCambiado, onSalir };
}

it('preselecciona el mozo actual y no permite guardar sin cambios', async () => {
  abrir(LUCIA);

  expect(screen.getByRole('dialog', { name: 'Cambiar mozo de la comanda #3' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /^Mozo/ })).toHaveValue('Lucía Fernández');
  expect(screen.getByRole('button', { name: 'Guardar mozo' })).toBeDisabled();
  await waitFor(() => expect(api.listarMozosHabilitados).toHaveBeenCalled());
});

it('deja el selector vacío para una comanda histórica sin mozo', async () => {
  abrir(null);

  expect(screen.getByRole('combobox', { name: /^Mozo/ })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Guardar mozo' })).toBeDisabled();
  await waitFor(() => expect(api.listarMozosHabilitados).toHaveBeenCalled());
});

it('guarda el mozo elegido y avisa el cambio', async () => {
  vi.mocked(api.asignarMozoComanda).mockResolvedValue({ exito: true, datos: null });
  const { onCambiado } = abrir(LUCIA);

  fireEvent.focus(screen.getByRole('combobox', { name: /^Mozo/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'Pedro Ruiz' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mozo' }));

  await waitFor(() => expect(api.asignarMozoComanda).toHaveBeenCalledWith(3, 33));
  expect(onCambiado).toHaveBeenCalledTimes(1);
});

it('muestra el detalle del backend y sigue abierto si el mozo fue rechazado', async () => {
  vi.mocked(api.asignarMozoComanda).mockResolvedValue({
    exito: false,
    datos: null,
    error: 'El mozo 33 está deshabilitado',
  });
  const { onCambiado } = abrir(null);

  fireEvent.focus(screen.getByRole('combobox', { name: /^Mozo/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'Pedro Ruiz' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mozo' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('El mozo 33 está deshabilitado');
  expect(onCambiado).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('cancela sin solicitar la operación', async () => {
  const { onSalir } = abrir(LUCIA);

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  expect(onSalir).toHaveBeenCalledTimes(1);
  expect(api.asignarMozoComanda).not.toHaveBeenCalled();
  await waitFor(() => expect(api.listarMozosHabilitados).toHaveBeenCalled());
});
