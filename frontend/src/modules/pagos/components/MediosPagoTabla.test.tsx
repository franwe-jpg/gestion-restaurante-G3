import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MedioPago } from '../types';

import { MediosPagoTabla } from './MediosPagoTabla';

const MEDIOS: MedioPago[] = [
  {
    id: 2,
    nombre: 'Billetera',
    tipo: 'BILLETERA_VIRTUAL',
    descripcion: 'QR',
    estado: 'HABILITADO',
  },
  { id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', descripcion: null, estado: 'DESHABILITADO' },
];

function mostrar(medios: MedioPago[], mensajeVacio = 'Vacío') {
  const onEditar = vi.fn();
  const onEliminar = vi.fn();
  render(
    <MediosPagoTabla
      mediosPago={medios}
      mensajeVacio={mensajeVacio}
      onEditar={onEditar}
      onEliminar={onEliminar}
    />,
  );
  return { onEditar, onEliminar };
}

describe('MediosPagoTabla (HU-M6-07)', () => {
  it('muestra nombre, tipo, descripción y estado en el orden recibido (CA 1 y CA 4)', () => {
    mostrar(MEDIOS);

    const [encabezado, billetera, efectivo] = screen.getAllByRole('row');
    expect(encabezado).toHaveTextContent('Nombre');
    expect(within(billetera as HTMLElement).getByText('Billetera virtual')).toBeInTheDocument();
    expect(within(billetera as HTMLElement).getByText('QR')).toBeInTheDocument();
    expect(efectivo).toHaveTextContent('Efectivo');
    expect(within(efectivo as HTMLElement).getByText('Deshabilitado')).toBeInTheDocument();
  });

  it('informa la lista vacía con el mensaje recibido (CA 3)', () => {
    mostrar([], 'No hay medios de pago disponibles para cobrar.');

    expect(screen.getByText('No hay medios de pago disponibles para cobrar.')).toBeInTheDocument();
  });

  it('ofrece editar y eliminar cada medio', () => {
    const { onEditar, onEliminar } = mostrar(MEDIOS);

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Efectivo»' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar «Billetera»' }));

    expect(onEditar).toHaveBeenCalledWith(MEDIOS[1]);
    expect(onEliminar).toHaveBeenCalledWith(MEDIOS[0]);
  });
});
