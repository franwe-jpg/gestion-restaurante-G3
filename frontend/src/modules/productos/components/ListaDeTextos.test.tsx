import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ListaDeTextos } from './ListaDeTextos';

interface BancoProps {
  inicial?: string[];
  tope?: number;
  maximoPorTexto?: number;
  error?: string;
  onCambiar?: (valores: string[]) => void;
}

function Banco({ inicial = [], tope = 50, maximoPorTexto = 100, error, onCambiar }: BancoProps) {
  const [valores, setValores] = useState(inicial);
  return (
    <ListaDeTextos
      id="ingredientes"
      etiqueta="Ingredientes"
      singular="ingrediente"
      plural="ingredientes"
      valores={valores}
      onCambiar={(nuevos) => {
        setValores(nuevos);
        onCambiar?.(nuevos);
      }}
      tope={tope}
      maximoPorTexto={maximoPorTexto}
      error={error}
    />
  );
}

function escribir(texto: string) {
  const campo = screen.getByLabelText(/Ingredientes/);
  fireEvent.change(campo, { target: { value: texto } });
  fireEvent.keyDown(campo, { key: 'Enter' });
  return campo;
}

describe('ListaDeTextos', () => {
  it('Enter agrega el texto recortado como chip y limpia el campo (CA 6)', () => {
    const onCambiar = vi.fn();
    render(<Banco onCambiar={onCambiar} />);

    const campo = escribir('  Huevo ');

    expect(screen.getByText('Huevo')).toBeInTheDocument();
    expect(onCambiar).toHaveBeenLastCalledWith(['Huevo']);
    expect(campo).toHaveValue('');
  });

  it('agrega varios chips en orden', () => {
    render(<Banco />);

    escribir('Huevo');
    escribir('Pan');

    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual([
      'Huevo',
      'Pan',
    ]);
  });

  it('no agrega un texto vacío y muestra un mensaje bajo el campo', () => {
    render(<Banco />);

    escribir('   ');

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('No se puede agregar un texto vacío.')).toBeInTheDocument();
  });

  it('no agrega un texto repetido sin distinguir mayúsculas', () => {
    render(<Banco inicial={['Huevo']} />);

    escribir('huevo');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('"huevo" ya está en la lista.')).toBeInTheDocument();
  });
});

describe('ListaDeTextos: límites', () => {
  it('no agrega un texto más largo que el máximo (CA 13)', () => {
    render(<Banco maximoPorTexto={30} />);

    escribir('a'.repeat(31));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('Cada ingrediente admite hasta 30 caracteres.')).toBeInTheDocument();

    escribir('a'.repeat(30));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/admite hasta 30/)).not.toBeInTheDocument();
  });

  it('no agrega más al llegar al tope', () => {
    render(<Banco inicial={['A', 'B']} tope={2} />);

    escribir('C');

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Se alcanzó el máximo de 2 ingredientes.')).toBeInTheDocument();
  });

  it('quita un chip y avisa la lista que queda (CA 6)', () => {
    const onCambiar = vi.fn();
    render(<Banco inicial={['Huevo', 'Pan']} onCambiar={onCambiar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Huevo' }));

    expect(onCambiar).toHaveBeenLastCalledWith(['Pan']);
    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual(['Pan']);
  });

  it('muestra el error que llega desde el formulario', () => {
    render(<Banco error="Agregue al menos un ingrediente." />);

    expect(screen.getByText('Agregue al menos un ingrediente.')).toBeInTheDocument();
  });
});

describe('ListaDeTextos: quitar y otras teclas', () => {
  it('ignora otras teclas', () => {
    render(<Banco />);
    const campo = screen.getByLabelText(/Ingredientes/);

    fireEvent.change(campo, { target: { value: 'Huevo' } });
    fireEvent.keyDown(campo, { key: 'a' });

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(campo).toHaveValue('Huevo');
  });
});
