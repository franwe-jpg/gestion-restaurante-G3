import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ComandasTabla } from './ComandasTabla';

const props = {
  pagina: {
    items: [
      {
        id: 3,
        mesa_id: 7,
        mozo_id: 31,
        estado: 'ABIERTA' as const,
        fecha_hora: '2026-11-11T12:00:00Z',
      },
      {
        id: 4,
        mesa_id: 8,
        mozo_id: null,
        estado: 'CERRADA' as const,
        fecha_hora: '2026-11-11T12:10:00Z',
      },
      {
        id: 5,
        mesa_id: 9,
        mozo_id: 32,
        estado: 'CERRADA' as const,
        fecha_hora: '2026-11-11T12:15:00Z',
      },
    ],
    total: 3,
    limit: 50,
    offset: 0,
  },
  mozos: [
    { id: 31, nombre: 'Lucía', apellido: 'Fernández', estado: 'HABILITADO' as const },
    { id: 32, nombre: 'Ana', apellido: 'Gómez', estado: 'DESHABILITADO' as const },
  ],
  hayFiltros: false,
  ocupado: false,
  puedeOperar: true,
  puedeFacturar: true,
  onCerrar: () => undefined,
  onEntregas: () => undefined,
  onModificar: () => undefined,
  onReabrir: () => undefined,
  onAnular: () => undefined,
  onFacturar: () => undefined,
  onCambiarMozo: () => undefined,
  onPagina: () => undefined,
};

it('muestra el nombre del mozo asignado y el estado claro del histórico sin asignación', () => {
  render(<ComandasTabla {...props} />);

  const asignada = screen.getByRole('row', { name: /Comanda #3/ });
  const historica = screen.getByRole('row', { name: /Comanda #4/ });
  const mozoDeshabilitado = screen.getByRole('row', { name: /Comanda #5/ });
  expect(within(asignada).getByText('Lucía Fernández')).toBeInTheDocument();
  expect(within(historica).getByText('Sin mozo asignado')).toBeInTheDocument();
  expect(within(mozoDeshabilitado).getByText('Ana Gómez')).toBeInTheDocument();
});

it('ofrece «Cambiar mozo» en cada comanda y entrega el mozo actual resuelto', () => {
  const onCambiarMozo = vi.fn();
  render(<ComandasTabla {...props} onCambiarMozo={onCambiarMozo} />);

  fireEvent.click(screen.getByRole('button', { name: 'Cambiar mozo de la comanda #3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar mozo de la comanda #4' }));
  expect(screen.getByRole('button', { name: 'Cambiar mozo de la comanda #5' })).toBeEnabled();
  expect(onCambiarMozo).toHaveBeenNthCalledWith(1, 3, props.mozos[0]);
  expect(onCambiarMozo).toHaveBeenNthCalledWith(2, 4, null);
});

it('sin permiso de operación no ofrece «Cambiar mozo»', () => {
  render(<ComandasTabla {...props} puedeOperar={false} />);

  expect(screen.queryByRole('button', { name: /Cambiar mozo/ })).not.toBeInTheDocument();
});
