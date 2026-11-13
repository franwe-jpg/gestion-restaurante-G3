import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { BotonTema } from './BotonTema';

const CLAVE = 'gestion-restaurante.tema';

afterEach(() => {
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

it('alterna entre modo oscuro y claro y recuerda la elección', () => {
  render(<BotonTema />);

  fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));

  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem(CLAVE)).toBe('oscuro');

  fireEvent.click(screen.getByRole('button', { name: 'Activar modo claro' }));

  expect(document.documentElement).not.toHaveClass('dark');
  expect(localStorage.getItem(CLAVE)).toBe('claro');
});
