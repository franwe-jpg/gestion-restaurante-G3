import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { FiltroEstado, ProductoListado } from '../types';

import { FILTROS_ESTADO } from './filtrosEstado';
import type { FiltroEstadoOpcion } from './filtrosEstado';
import { ProductosTabla } from './ProductosTabla';
import type { ProductosTablaProps } from './ProductosTabla';

function filtroDe(valor: FiltroEstado): FiltroEstadoOpcion {
  const filtro = FILTROS_ESTADO.find((f) => f.valor === valor);
  if (!filtro) throw new Error(`Filtro desconocido: ${valor}`);
  return filtro;
}

const MILANESA: ProductoListado = {
  id: 1,
  nombre: 'Milanesa',
  categoria: 'PLATO',
  seccion: { id: 3, nombre: 'Platos principales' },
  precio: '12500.50',
  etiquetas: ['Sin TACC', 'Vegano'],
  estado: 'HABILITADO',
};
const FLAN: ProductoListado = {
  id: 2,
  nombre: 'Flan',
  categoria: 'POSTRE',
  seccion: { id: 4, nombre: 'Postres' },
  precio: '3000.00',
  etiquetas: [],
  estado: 'DESHABILITADO',
};
const COCA: ProductoListado = { ...FLAN, id: 3, nombre: 'Coca', categoria: 'BEBIDA' };

function mostrar(propiedades: Partial<ProductosTablaProps> = {}) {
  return render(
    <MemoryRouter>
      <ProductosTabla
        productos={[]}
        filtro={filtroDe('HABILITADO')}
        renderAcciones={() => null}
        {...propiedades}
      />
    </MemoryRouter>,
  );
}

describe('ProductosTabla', () => {
  it('muestra nombre, categoría, sección, precio y una insignia por etiqueta (CA 1)', () => {
    mostrar({ productos: [MILANESA, FLAN, COCA] });

    expect(screen.getByText('Milanesa')).toBeInTheDocument();
    expect(screen.getByText('Plato')).toBeInTheDocument();
    expect(screen.getByText('Postre')).toBeInTheDocument();
    expect(screen.getByText('Bebida')).toBeInTheDocument();
    expect(screen.getByText('Platos principales')).toBeInTheDocument();
    expect(screen.getByText(/12\.500,50/)).toBeInTheDocument();
    expect(screen.getByText('Sin TACC')).toBeInTheDocument();
    expect(screen.getByText('Vegano')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('muestra el estado de cada producto con una insignia (CA 6)', () => {
    mostrar({ productos: [MILANESA, FLAN], filtro: filtroDe('TODOS') });

    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
  });

  it.each(FILTROS_ESTADO)('sin productos muestra solo el vacío de «$etiqueta» (CA 2)', (filtro) => {
    mostrar({ filtro });

    expect(screen.getByText(filtro.vacioTitulo)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Nombre')).not.toBeInTheDocument();
  });

  it('no muestra el vacío mientras carga y usa los estados de DataTable', () => {
    mostrar({ cargando: true });

    expect(screen.queryByText(filtroDe('HABILITADO').vacioTitulo)).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('muestra el error con la opción de reintentar', () => {
    const onReintentar = vi.fn();
    mostrar({ error: 'Falló la carga', onReintentar });

    expect(screen.getByText('Falló la carga')).toBeInTheDocument();
    expect(screen.queryByText(filtroDe('HABILITADO').vacioTitulo)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('muestra solo los productos recibidos, sin filas de menús del día (S26)', () => {
    mostrar({ productos: [FLAN], filtro: filtroDe('DESHABILITADO') });

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByText('Milanesa')).not.toBeInTheDocument();
  });

  it('renderiza las acciones de cada fila', () => {
    mostrar({
      productos: [MILANESA],
      renderAcciones: (producto) => <span>Acciones de {producto.nombre}</span>,
    });

    expect(screen.getByText('Acciones de Milanesa')).toBeInTheDocument();
  });
});
