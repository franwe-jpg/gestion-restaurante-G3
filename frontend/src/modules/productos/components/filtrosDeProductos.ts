import { useState } from 'react';

import { ETIQUETAS_CATEGORIA } from '../categorias';
import type { Categoria, ProductoListado } from '../types';

export type FiltroCategoria = Categoria | 'TODAS';

export interface OpcionSeccion {
  id: number;
  nombre: string;
}

export interface FiltrosLocales {
  busqueda: string;
  categoria: FiltroCategoria;
  seccionId: string;
}

export const CATEGORIAS_FILTRO: FiltroCategoria[] = [
  'TODAS',
  'PLATO',
  'POSTRE',
  'BEBIDA',
  'MENU_DEL_DIA',
];

export function etiquetaCategoria(categoria: FiltroCategoria): string {
  return categoria === 'TODAS' ? 'Todas las categorías' : ETIQUETAS_CATEGORIA[categoria];
}

export function esFiltroCategoria(valor: string): valor is FiltroCategoria {
  return (CATEGORIAS_FILTRO as string[]).includes(valor);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Filtra por nombre (sin tildes), categoría y sección sobre lo ya cargado. */
export function filtrarProductos(
  items: ProductoListado[],
  busqueda: string,
  categoria: FiltroCategoria,
  seccionId: string,
): ProductoListado[] {
  const texto = normalizar(busqueda.trim());
  return items.filter((item) => {
    if (categoria !== 'TODAS' && item.categoria !== categoria) return false;
    if (seccionId !== 'TODAS' && String(item.seccion.id) !== seccionId) return false;
    if (texto.length > 0 && !normalizar(item.nombre).includes(texto)) return false;
    return true;
  });
}

/** Secciones distintas presentes en lo cargado, para el filtro. */
export function opcionesDeSeccion(items: ProductoListado[]): OpcionSeccion[] {
  const mapa = new Map<number, string>();
  for (const item of items) {
    if (!mapa.has(item.seccion.id)) mapa.set(item.seccion.id, item.seccion.nombre);
  }
  return [...mapa.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Búsqueda y filtros locales del listado; activos si alguno difiere del valor inicial. */
export function useFiltrosLocales() {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<FiltroCategoria>('TODAS');
  const [seccionId, setSeccionId] = useState('TODAS');
  const filtrosActivos = busqueda.trim() !== '' || categoria !== 'TODAS' || seccionId !== 'TODAS';

  const aplicar = (parche: Partial<FiltrosLocales>) => {
    if (parche.busqueda !== undefined) setBusqueda(parche.busqueda);
    if (parche.categoria !== undefined) setCategoria(parche.categoria);
    if (parche.seccionId !== undefined) setSeccionId(parche.seccionId);
  };
  const limpiar = () => aplicar({ busqueda: '', categoria: 'TODAS', seccionId: 'TODAS' });

  return { busqueda, categoria, seccionId, filtrosActivos, aplicar, limpiar };
}
