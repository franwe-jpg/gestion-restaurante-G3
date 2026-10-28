import { useState } from 'react';

import { Input } from '../../../shared/components/ui/input';
import type { ProductoSeleccionable } from '../types';

interface SelectorProductosMenuProps {
  productos: ProductoSeleccionable[];
  seleccionados: number[];
  error?: string;
  onCambiar: (ids: number[]) => void;
}

function alternarProducto(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id];
}

function ProductoDisponible({
  producto,
  seleccionado,
  onCambiar,
}: {
  producto: ProductoSeleccionable;
  seleccionado: boolean;
  onCambiar: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        aria-label={`Incluir ${producto.nombre}`}
        checked={seleccionado}
        onChange={onCambiar}
      />
      <span>{producto.nombre}</span>
      <span className="text-xs text-slate-500">{producto.categoria.toLowerCase()}</span>
    </label>
  );
}

function ProductosSeleccionados({
  productos,
  seleccionados,
  onCambiar,
}: SelectorProductosMenuProps) {
  return (
    <ul aria-label="Productos incluidos" className="flex flex-wrap gap-2">
      {productos
        .filter((producto) => seleccionados.includes(producto.id))
        .map((producto) => (
          <li key={producto.id}>
            <button
              type="button"
              className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900"
              aria-label={`Quitar ${producto.nombre}`}
              onClick={() => onCambiar(alternarProducto(seleccionados, producto.id))}
            >
              {producto.nombre} ×
            </button>
          </li>
        ))}
    </ul>
  );
}

function ListaProductosDisponibles({
  productos,
  seleccionados,
  error,
  onCambiar,
}: SelectorProductosMenuProps) {
  return (
    <div
      role="group"
      aria-label="Productos disponibles"
      aria-describedby={error ? 'producto-ids-error' : undefined}
      className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3"
    >
      {productos.map((producto) => (
        <ProductoDisponible
          key={producto.id}
          producto={producto}
          seleccionado={seleccionados.includes(producto.id)}
          onCambiar={() => onCambiar(alternarProducto(seleccionados, producto.id))}
        />
      ))}
      {productos.length === 0 && (
        <p className="text-sm text-slate-500">No hay productos habilitados que coincidan.</p>
      )}
    </div>
  );
}

export function SelectorProductosMenu({
  productos,
  seleccionados,
  error,
  onCambiar,
}: SelectorProductosMenuProps) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = productos.filter((producto) =>
    producto.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        id="producto-ids"
        placeholder="Buscar productos habilitados"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.currentTarget.value)}
      />
      <ListaProductosDisponibles
        productos={visibles}
        seleccionados={seleccionados}
        error={error}
        onCambiar={onCambiar}
      />
      {seleccionados.length > 0 && (
        <ProductosSeleccionados
          productos={productos}
          seleccionados={seleccionados}
          onCambiar={onCambiar}
        />
      )}
    </div>
  );
}
