import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { CredencialesPrueba } from './CredencialesPrueba';

function abrir() {
  fireEvent.click(screen.getByRole('button', { name: /Credenciales de prueba/ }));
}

it('arranca cerrado y no muestra las filas', () => {
  render(<CredencialesPrueba onElegir={vi.fn()} />);

  expect(screen.getByRole('button', { name: /Credenciales de prueba/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(screen.queryByRole('button', { name: /Usar credenciales de/ })).not.toBeInTheDocument();
});

it('al abrirlo muestra las tres credenciales', () => {
  render(<CredencialesPrueba onElegir={vi.fn()} />);

  abrir();

  expect(screen.getByRole('button', { name: /Credenciales de prueba/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  expect(screen.getAllByRole('button', { name: /Usar credenciales de/ })).toHaveLength(3);
  expect(screen.getByText('Recomendado')).toBeInTheDocument();
});

it.each([
  ['Encargado', 'encargado@gmail.com'],
  ['Mozo', 'mozo@gmail.com'],
  ['Chef', 'chef@gmail.com'],
])('al tocar %s llama a onElegir con su correo y la contraseña', (rol, correo) => {
  const onElegir = vi.fn();
  render(<CredencialesPrueba onElegir={onElegir} />);

  abrir();
  fireEvent.click(screen.getByRole('button', { name: `Usar credenciales de ${rol}` }));

  expect(onElegir).toHaveBeenCalledWith(correo, 'Resto123!');
});

it('marca como seleccionada la fila del correo cargado', () => {
  render(<CredencialesPrueba onElegir={vi.fn()} correo="mozo@gmail.com" />);

  abrir();

  expect(screen.getByRole('button', { name: 'Usar credenciales de Mozo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getAllByRole('img', { name: 'Seleccionado' })).toHaveLength(1);
});
