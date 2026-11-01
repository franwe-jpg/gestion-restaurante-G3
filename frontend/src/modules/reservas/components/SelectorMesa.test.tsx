import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MesaDisponible } from '../types';

import { SelectorMesa } from './SelectorMesa';
import type { SelectorMesaProps } from './SelectorMesa';
import type { EstadoMesasDisponibles } from './useMesasDisponibles';

const SALON = { id: 1, nombre: 'Salón' };
const TERRAZA = { id: 2, nombre: 'Terraza' };

const MESA_5: MesaDisponible = { id: 5, numero: 5, capacidad: 4, sector: SALON };
const MESA_12: MesaDisponible = { id: 12, numero: 1, capacidad: 2, sector: TERRAZA };
const MESA_14: MesaDisponible = { id: 14, numero: 1, capacidad: 4, sector: SALON };

function listo(...mesas: MesaDisponible[]): EstadoMesasDisponibles {
  return { tipo: 'listo', mesas };
}

function mostrar(estado: EstadoMesasDisponibles, props: Partial<SelectorMesaProps> = {}) {
  const onCambiar = vi.fn();
  render(<SelectorMesa estado={estado} valor="" onCambiar={onCambiar} {...props} />);
  return { onCambiar, selector: screen.getByLabelText(/Mesa/) };
}

/** Texto y valor de cada opción, en el orden en que se ofrecen. */
function opciones() {
  return screen
    .queryAllByRole<HTMLOptionElement>('option')
    .map((opcion) => [opcion.textContent, opcion.value]);
}

describe('SelectorMesa: con mesas', () => {
  it('ofrece «Sector · Mesa N (capacidad personas)» con el id de la mesa como valor', () => {
    const { selector } = mostrar(listo(MESA_5, MESA_12));

    expect(selector).toBeEnabled();
    expect(opciones()).toEqual([
      ['Seleccione una mesa', ''],
      ['Salón · Mesa 5 (4 personas)', '5'],
      ['Terraza · Mesa 1 (2 personas)', '12'],
    ]);
  });

  it('distingue el mismo número en sectores distintos, sin opciones repetidas', () => {
    mostrar(listo(MESA_14, MESA_12));

    const textos = opciones().map(([texto]) => texto);

    expect(opciones()).toEqual([
      ['Seleccione una mesa', ''],
      ['Salón · Mesa 1 (4 personas)', '14'],
      ['Terraza · Mesa 1 (2 personas)', '12'],
    ]);
    expect(new Set(textos).size).toBe(textos.length);
  });

  it('con capacidad 1 el texto dice «(1 personas)»', () => {
    mostrar(listo({ ...MESA_5, capacidad: 1 }));

    expect(screen.getByRole('option', { name: 'Salón · Mesa 5 (1 personas)' })).toHaveValue('5');
  });

  it('muestra como elegida la mesa del valor recibido', () => {
    const { selector } = mostrar(listo(MESA_5, MESA_12), { valor: '12' });

    expect(selector).toHaveValue('12');
  });

  it('al elegir una opción llama a onCambiar con el id como texto', () => {
    const { onCambiar, selector } = mostrar(listo(MESA_5, MESA_12));

    fireEvent.change(selector, { target: { value: '12' } });

    expect(onCambiar).toHaveBeenCalledExactlyOnceWith('12');
  });

  it('se rotula «Mesa» y marca el campo como obligatorio', () => {
    const { selector } = mostrar(listo(MESA_5));

    expect(screen.getByLabelText('Mesa*')).toBe(selector);
  });
});

describe('SelectorMesa: sin mesas para elegir', () => {
  it('inactivo: deshabilitado y sin opciones', () => {
    const { selector } = mostrar({ tipo: 'inactivo' });

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([]);
  });

  it('cargando: deshabilitado y con «Cargando mesas…» como única opción', () => {
    const { selector } = mostrar({ tipo: 'cargando' });

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([['Cargando mesas…', '']]);
  });

  it('lista vacía: deshabilitado y con el aviso como única opción', () => {
    const { selector } = mostrar(listo());

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([['No hay mesas disponibles para esa fecha y hora', '']]);
  });

  it('error: deshabilitado, sin opciones y con el mensaje de la API junto al campo', () => {
    const mensaje = 'La hora de la reserva debe ser posterior a la hora actual';

    const { selector } = mostrar({ tipo: 'error', mensaje });

    expect(selector).toBeDisabled();
    expect(opciones()).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
  });
});

describe('SelectorMesa: error del campo', () => {
  it('muestra bajo el campo el error recibido', () => {
    mostrar(listo(MESA_5), { error: 'La mesa es obligatoria.' });

    expect(screen.getByRole('alert')).toHaveTextContent('La mesa es obligatoria.');
  });

  it('sin error no muestra ningún aviso', () => {
    mostrar(listo(MESA_5));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('con el error recibido y el de la consulta, gana el recibido (validación local)', () => {
    mostrar({ tipo: 'error', mensaje: 'La consulta falló' }, { error: 'La mesa es obligatoria.' });

    expect(screen.getByRole('alert')).toHaveTextContent('La mesa es obligatoria.');
    expect(screen.queryByText('La consulta falló')).toBeNull();
  });
});
