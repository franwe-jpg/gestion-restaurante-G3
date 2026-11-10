import { useCallback } from 'react';
import { useApi } from '../../../shared/hooks/useApi';
import type {
  CatalogoComanda,
  DetalleComandaCrear,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  ProductoSeleccionable,
} from '../types';
import { cargarCatalogo, nombreDeDetalle } from './catalogoComanda';

const SIN_CATALOGO: CatalogoComanda = {
  mesasLibres: [],
  productos: [],
  menus: [],
  nombres: { productos: {}, menus: {} },
};

export function useCatalogoComanda(opciones: { conMesas?: boolean } = {}): {
  mesasLibres: MesaSeleccionable[];
  productos: ProductoSeleccionable[];
  menus: MenuEjecutivoSeleccionable[];
  nombreDe: (detalle: DetalleComandaCrear) => string;
  cargando: boolean;
  error: string | null;
} {
  const conMesas = opciones.conMesas ?? false;
  const { datos, cargando, error } = useApi(
    () => cargarCatalogo(conMesas),
    `catalogo-comanda-${conMesas}`,
  );
  const catalogo = datos ?? SIN_CATALOGO;
  const { nombres } = catalogo;
  const nombreDe = useCallback(
    (detalle: DetalleComandaCrear) => nombreDeDetalle(nombres, detalle),
    [nombres],
  );
  return {
    mesasLibres: catalogo.mesasLibres,
    productos: catalogo.productos,
    menus: catalogo.menus,
    nombreDe,
    cargando,
    error,
  };
}
