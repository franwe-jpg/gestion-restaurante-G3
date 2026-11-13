import { useState } from 'react';
import { BookOpen, SearchX } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { SearchInput } from '../../../shared/components/ui/search-input';
import { Spinner } from '../../../shared/components/ui/spinner';
import type { FiltroEstado, SeccionCarta } from '../types';

import { CartaNavegacion } from './CartaNavegacion';
import { CartaSeccion } from './CartaSeccion';

const CARTA_VACIA: Record<FiltroEstado, string> = {
  HABILITADO: 'No hay productos habilitados en la carta.',
  DESHABILITADO: 'No hay secciones ni productos dados de baja.',
  TODOS: 'No hay secciones cargadas.',
};

export interface CartaVistaProps {
  secciones: SeccionCarta[];
  filtro: FiltroEstado;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Secciones con al menos un producto que coincide con la búsqueda (sin tildes). */
function filtrarCarta(secciones: SeccionCarta[], busqueda: string): SeccionCarta[] {
  const texto = normalizar(busqueda.trim());
  if (texto === '') return secciones;
  return secciones
    .map((seccion) => ({
      ...seccion,
      productos: seccion.productos.filter((producto) =>
        normalizar(producto.nombre).includes(texto),
      ),
    }))
    .filter((seccion) => seccion.productos.length > 0);
}

function BusquedaCarta({
  busqueda,
  onBusqueda,
}: {
  busqueda: string;
  onBusqueda: (valor: string) => void;
}) {
  return (
    <SearchInput
      type="search"
      aria-label="Buscar en la carta"
      placeholder="Buscar por nombre"
      value={busqueda}
      onChange={(evento) => onBusqueda(evento.target.value)}
      onLimpiar={() => onBusqueda('')}
    />
  );
}

function ConteoCarta({ secciones }: { secciones: SeccionCarta[] }) {
  const productos = secciones.reduce((total, seccion) => total + seccion.productos.length, 0);
  const unidadSeccion = secciones.length === 1 ? 'sección' : 'secciones';
  const unidadProducto = productos === 1 ? 'producto' : 'productos';
  return (
    <p aria-live="polite" className="text-sm text-slate-600">
      {secciones.length} {unidadSeccion} · {productos} {unidadProducto}
    </p>
  );
}

function CartaSinResultados({
  busqueda,
  onBusqueda,
}: {
  busqueda: string;
  onBusqueda: (valor: string) => void;
}) {
  return (
    <div className="space-y-4">
      <BusquedaCarta busqueda={busqueda} onBusqueda={onBusqueda} />
      <EmptyState
        icono={SearchX}
        titulo="Sin resultados en la carta"
        descripcion="Ningún producto coincide con esa búsqueda."
      />
      <div className="flex justify-center">
        <Button variant="brand-outline" onClick={() => onBusqueda('')}>
          Limpiar búsqueda
        </Button>
      </div>
    </div>
  );
}

function CartaConResultados({
  visibles,
  filtro,
  busqueda,
  onBusqueda,
}: {
  visibles: SeccionCarta[];
  filtro: FiltroEstado;
  busqueda: string;
  onBusqueda: (valor: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <BusquedaCarta busqueda={busqueda} onBusqueda={onBusqueda} />
        <ConteoCarta secciones={visibles} />
      </div>
      <CartaNavegacion secciones={visibles} />
      {visibles.map((seccion) => (
        <CartaSeccion key={seccion.id} seccion={seccion} filtro={filtro} />
      ))}
    </div>
  );
}

export function CartaVista({ secciones, filtro, cargando, error, onReintentar }: CartaVistaProps) {
  const [busqueda, setBusqueda] = useState('');

  if (cargando) return <Spinner etiqueta="Cargando carta..." />;
  if (error) {
    return (
      <ErrorState
        titulo="No se pudo cargar la carta."
        descripcion={error}
        onReintentar={onReintentar}
      />
    );
  }
  if (secciones.length === 0) {
    return (
      <EmptyState
        icono={BookOpen}
        titulo={CARTA_VACIA[filtro]}
        descripcion="Cambie el filtro para ver otros productos."
      />
    );
  }

  const visibles = filtrarCarta(secciones, busqueda);
  if (visibles.length === 0) {
    return <CartaSinResultados busqueda={busqueda} onBusqueda={setBusqueda} />;
  }
  return (
    <CartaConResultados
      visibles={visibles}
      filtro={filtro}
      busqueda={busqueda}
      onBusqueda={setBusqueda}
    />
  );
}
