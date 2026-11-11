import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import { sinSesion, usarRoles } from '../../test/sesionDePrueba';

import { LoginPage } from './LoginPage';

function renderizar(estadoInicial?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: estadoInicial }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Pantalla de inicio</p>} />
        <Route path="/atencion" element={<p>Pantalla de atención</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function completar(correo: string, contrasena: string) {
  fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: correo } });
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: contrasena } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

it('un inicio válido llama a iniciarSesion y lleva al inicio', async () => {
  const iniciarSesion = vi.fn().mockResolvedValue({ exito: true });
  sinSesion({ iniciarSesion });
  renderizar();

  completar('  mozo@resto.com ', 'clave-1234');

  expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
  expect(iniciarSesion).toHaveBeenCalledWith('mozo@resto.com', 'clave-1234');
});

it('después de iniciar vuelve a la ruta de origen guardada', async () => {
  sinSesion({ iniciarSesion: vi.fn().mockResolvedValue({ exito: true }) });
  renderizar({ desde: '/atencion' });

  completar('a@resto.com', 'clave-1234');

  expect(await screen.findByText('Pantalla de atención')).toBeInTheDocument();
});

it('ignora un origen que no es una ruta interna', async () => {
  sinSesion({ iniciarSesion: vi.fn().mockResolvedValue({ exito: true }) });
  renderizar({ desde: 'https://externo.test' });

  completar('a@resto.com', 'clave-1234');

  expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
});

it('con 401 muestra el mensaje y conserva el correo', async () => {
  const iniciarSesion = vi
    .fn()
    .mockResolvedValue({ exito: false, error: 'Correo o contraseña incorrectos' });
  sinSesion({ iniciarSesion });
  renderizar();

  completar('mozo@resto.com', 'mala-clave');

  expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  expect(screen.getByLabelText(/Correo/)).toHaveValue('mozo@resto.com');
  expect(screen.queryByText('Pantalla de inicio')).not.toBeInTheDocument();
});

it('si falla sin mensaje muestra uno por defecto', async () => {
  sinSesion({ iniciarSesion: vi.fn().mockResolvedValue({ exito: false }) });
  renderizar();

  completar('mozo@resto.com', 'clave-1234');

  expect(await screen.findByText('No se pudo iniciar sesión')).toBeInTheDocument();
});

it('con campos vacíos informa los obligatorios y no envía la solicitud', () => {
  const iniciarSesion = vi.fn();
  sinSesion({ iniciarSesion });
  renderizar();

  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

  expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument();
  expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
  expect(iniciarSesion).not.toHaveBeenCalled();
});

it('con solo el correo vacío informa solo ese campo', () => {
  const iniciarSesion = vi.fn();
  sinSesion({ iniciarSesion });
  renderizar();

  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'clave-1234' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

  expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument();
  expect(screen.queryByText('La contraseña es obligatoria.')).not.toBeInTheDocument();
  expect(iniciarSesion).not.toHaveBeenCalled();
});

it('con sesión vigente lleva al inicio sin mostrar el formulario', () => {
  usarRoles(['MOZO']);
  renderizar();

  expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument();
});

it('mientras restaura la sesión no muestra el formulario', async () => {
  sinSesion({ cargando: true });
  renderizar();

  await waitFor(() => expect(screen.queryByLabelText(/Correo/)).not.toBeInTheDocument());
});
