import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../../shared/hooks/useApi';
import { listarMozosHabilitados } from '../api';
import type {
  CatalogoComanda,
  DetalleComandaCrear,
  MenuEjecutivoSeleccionable,
  MesaSeleccionable,
  MozoSeleccionable,
  ProductoSeleccionable,
} from '../types';
import { buscarMozos, cargarCatalogo, nombreDeDetalle } from './catalogoComanda';

const SIN_CATALOGO: CatalogoComanda = {
  mesasLibres: [],
  mozos: [],
  productos: [],
  menus: [],
  nombres: { productos: {}, menus: {} },
};

export function useCatalogoComanda(
  opciones: {
    conMesas?: boolean;
    conMozos?: boolean;
    soloMozos?: boolean;
    incluirMozosDeshabilitados?: boolean;
  } = {},
): {
  mesasLibres: MesaSeleccionable[];
  mozos: MozoSeleccionable[];
  productos: ProductoSeleccionable[];
  menus: MenuEjecutivoSeleccionable[];
  nombreDe: (detalle: DetalleComandaCrear) => string;
  cargando: boolean;
  error: string | null;
} {
  const conMesas = opciones.conMesas ?? false;
  const conMozos = opciones.conMozos ?? false;
  const soloMozos = opciones.soloMozos ?? false;
  const incluirMozosDeshabilitados = opciones.incluirMozosDeshabilitados ?? false;
  const { datos, cargando, error } = useApi(
    () => cargarCatalogo(conMesas, conMozos, soloMozos, incluirMozosDeshabilitados),
    `catalogo-comanda-${conMesas}-${conMozos}-${soloMozos}-${incluirMozosDeshabilitados}`,
  );
  const catalogo = datos ?? SIN_CATALOGO;
  const { nombres } = catalogo;
  const nombreDe = useCallback(
    (detalle: DetalleComandaCrear) => nombreDeDetalle(nombres, detalle),
    [nombres],
  );
  return {
    mesasLibres: catalogo.mesasLibres,
    mozos: catalogo.mozos,
    productos: catalogo.productos,
    menus: catalogo.menus,
    nombreDe,
    cargando,
    error,
  };
}

export function useMozosHabilitados(busqueda: string) {
  const [resultado, setResultado] = useState<{
    busqueda: string;
    revision: number;
    mozos: MozoSeleccionable[];
    cargando: boolean;
    error: string | null;
  }>({ busqueda: '', revision: -1, mozos: [], cargando: true, error: null });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    void listarMozosHabilitados(busqueda)
      .then((respuesta) => {
        if (!vigente) return;
        setResultado({
          busqueda,
          revision,
          mozos: respuesta.exito ? (respuesta.datos ?? []) : [],
          error: respuesta.exito ? null : (respuesta.error ?? 'No se pudieron cargar los mozos'),
          cargando: false,
        });
      })
      .catch((causa: unknown) => {
        if (!vigente) return;
        setResultado({
          busqueda,
          revision,
          mozos: [],
          error: causa instanceof Error ? causa.message : 'No se pudieron cargar los mozos',
          cargando: false,
        });
      });
    return () => {
      vigente = false;
    };
  }, [busqueda, revision]);

  const recargar = useCallback(() => {
    setRevision((actual) => actual + 1);
  }, []);

  const resultadoActual = resultado.busqueda === busqueda && resultado.revision === revision;
  const mozos = resultadoActual ? resultado.mozos : [];
  return {
    mozos: buscarMozos(mozos, busqueda),
    cargando: !resultadoActual || resultado.cargando,
    error: resultadoActual ? resultado.error : null,
    recargar,
  };
}
