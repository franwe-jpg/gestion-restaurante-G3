import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { useSesion } from '../../../shared/auth/useSesion';
import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import { listarProductos } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta } from '../categorias';
import type { FiltroEstado, ProductoListado } from '../types';

import { AccionesProducto } from './AccionesProducto';
import { filtroDe } from './filtrosEstado';
import { FiltrosProductos, SinResultadosConFiltros } from './FiltrosProductos';
import { filtrarProductos, opcionesDeSeccion, useFiltrosLocales } from './filtrosDeProductos';
import { ProductoFormDialog } from './ProductoFormDialog';
import { ProductosTabla } from './ProductosTabla';

const LIMITE_PAGINA = 50;
/** Al filtrar se trae un tramo amplio para buscar sobre todo lo cargado. */
const LIMITE_FILTROS = 500;

const CATEGORIAS_ALTA: CategoriaAlta[] = ['PLATO', 'POSTRE', 'BEBIDA'];

function BotonesAlta({ onNuevo }: { onNuevo: (categoria: CategoriaAlta) => void }) {
  return (
    <>
      {CATEGORIAS_ALTA.map((categoria) => (
        <Button key={categoria} variant="brand-outline" onClick={() => onNuevo(categoria)}>
          {CONFIGURACIONES[categoria].titulo}
        </Button>
      ))}
    </>
  );
}

/** `productoId` presente edita ese producto; sin él, el diálogo crea uno de la categoría. */
interface DialogoAbierto {
  categoria: CategoriaAlta;
  productoId?: number;
}

export interface ProductosTabProps {
  /** Lleva a la pestaña «Secciones» desde el aviso «Primero hay que crear una sección». */
  onIrASecciones?: () => void;
}

/** Listado filtrado por estado y paginado (D-27); con filtros locales trae un tramo amplio. */
function useListadoProductos(filtrosActivos: boolean) {
  const [estado, setEstado] = useState<FiltroEstado>('HABILITADO');
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_PAGINA });
  const limite = filtrosActivos ? LIMITE_FILTROS : LIMITE_PAGINA;
  const offset = filtrosActivos ? 0 : paginacion.offset;
  const productos = useApi(
    () => listarProductos(estado, limite, offset),
    `productos-${estado}-${filtrosActivos ? 'filtros' : paginacion.offset}`,
  );

  const totalActual = productos.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  const items = productos.datos?.items ?? [];

  const cambiarEstado = (valor: FiltroEstado) => {
    setEstado(valor);
    paginacion.irAPagina(1);
  };

  const alDarDeBaja = () => {
    // Con filtros locales la paginación está oculta: siempre se recarga (E22).
    if (!filtrosActivos && items.length === 1 && paginacion.pagina > 1) paginacion.anterior();
    else productos.recargar();
  };

  return { estado, cambiarEstado, paginacion, productos, items, total, alDarDeBaja };
}

function PaginacionDelListado({ paginacion }: { paginacion: ReturnType<typeof usePaginacion> }) {
  if (paginacion.totalPaginas <= 1) return null;
  return (
    <Pagination
      pagina={paginacion.pagina}
      totalPaginas={paginacion.totalPaginas}
      onCambiarPagina={paginacion.irAPagina}
    />
  );
}

type AlEditar = (categoria: CategoriaAlta, productoId: number) => void;

function renderizarAcciones(onEditar: AlEditar, onDadoDeBaja: () => void) {
  return function AccionesDeLaFila(producto: ProductoListado) {
    return <AccionesProducto producto={producto} onEditar={onEditar} onDadoDeBaja={onDadoDeBaja} />;
  };
}

interface PieDeProductosProps {
  paginacion: ReturnType<typeof usePaginacion>;
  cantidadFilas: number;
}

/** Resumen del tramo visible y paginador; no se muestra si el listado está vacío. */
function PieDeProductos({ paginacion, cantidadFilas }: PieDeProductosProps) {
  const total = paginacion.total;
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={paginacion.offset + 1}
        hasta={Math.min(paginacion.offset + cantidadFilas, total)}
        total={total}
        etiqueta="productos"
        etiquetaSingular="producto"
      />
      <PaginacionDelListado paginacion={paginacion} />
    </div>
  );
}

/** Cuántos coinciden con los filtros locales, sobre lo cargado del servidor. */
function textoResultado(filtrados: number, cargados: number, total: number): string {
  const unidad = total === 1 ? 'producto' : 'productos';
  const base = `Mostrando ${filtrados} de ${total} ${unidad}`;
  if (total > cargados) return `${base} (se revisaron los primeros ${cargados})`;
  return base;
}

type Filtros = ReturnType<typeof useFiltrosLocales>;

interface BarraProps {
  filtros: Filtros;
  items: ProductoListado[];
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  filtrados: ProductoListado[];
  gestiona: boolean;
  onNuevo: (categoria: CategoriaAlta) => void;
}

/** Acciones (exportar, altas) y filtros: búsqueda, categoría, sección y estado. */
function BarraDelListado({
  filtros,
  items,
  estado,
  onCambiarEstado,
  filtrados,
  gestiona,
  onNuevo,
}: BarraProps) {
  const opcionesSeccion = opcionesDeSeccion(items);
  return (
    <TableToolbar
      acciones={
        <>
          <ExportButton filas={filtrados} nombreArchivo="productos" />
          {gestiona && <BotonesAlta onNuevo={onNuevo} />}
        </>
      }
    >
      <FilterBar className="border-0 p-0">
        <FiltrosProductos
          busqueda={filtros.busqueda}
          onBusqueda={(busqueda) => filtros.aplicar({ busqueda })}
          categoria={filtros.categoria}
          onCategoria={(categoria) => filtros.aplicar({ categoria })}
          seccionId={filtros.seccionId}
          onSeccion={(seccionId) => filtros.aplicar({ seccionId })}
          opcionesSeccion={opcionesSeccion}
          estado={estado}
          onEstado={onCambiarEstado}
        />
      </FilterBar>
    </TableToolbar>
  );
}

interface CuerpoProps {
  resumen: string | null;
  sinResultados: boolean;
  onLimpiarFiltros: () => void;
  filtrados: ProductoListado[];
  estado: FiltroEstado;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  gestiona: boolean;
  onEditar: AlEditar;
  onDadoDeBaja: () => void;
}

/** Conteo de resultados y tabla; vacío propio cuando los filtros no coinciden. */
function CuerpoDelListado({
  resumen,
  sinResultados,
  onLimpiarFiltros,
  filtrados,
  estado,
  cargando,
  error,
  onReintentar,
  gestiona,
  onEditar,
  onDadoDeBaja,
}: CuerpoProps) {
  return (
    <>
      {resumen && (
        <p aria-live="polite" className="text-sm text-slate-600">
          {resumen}
        </p>
      )}
      {sinResultados ? (
        <SinResultadosConFiltros onLimpiar={onLimpiarFiltros} />
      ) : (
        <ProductosTabla
          productos={filtrados}
          filtro={filtroDe(estado)}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          renderAcciones={gestiona ? renderizarAcciones(onEditar, onDadoDeBaja) : undefined}
        />
      )}
    </>
  );
}

/** Paginador solo sin filtros locales; con filtros se muestra el conteo del cuerpo. */
function PieCondicional({
  filtrosActivos,
  paginacion,
  cantidadFilas,
}: PieDeProductosProps & { filtrosActivos: boolean }) {
  if (filtrosActivos) return null;
  return <PieDeProductos paginacion={paginacion} cantidadFilas={cantidadFilas} />;
}

interface DialogoProps {
  dialogo: DialogoAbierto | null;
  onGuardado: () => void;
  onDadoDeBaja: () => void;
  onIrASecciones?: () => void;
  onOpenChange: (abierto: boolean) => void;
}

function DialogoDelTab({ dialogo, ...props }: DialogoProps) {
  if (!dialogo) return null;
  return (
    <ProductoFormDialog
      categoria={dialogo.categoria}
      productoId={dialogo.productoId}
      onGuardado={props.onGuardado}
      onDadoDeBaja={props.onDadoDeBaja}
      onIrASecciones={props.onIrASecciones}
      onOpenChange={props.onOpenChange}
    />
  );
}

/** Marco del listado según el patrón de la guía: tarjeta con espaciado vertical. */
function TarjetaDelListado({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">{children}</CardContent>
    </Card>
  );
}

interface ListadoDeProductosProps {
  items: ProductoListado[];
  filtrados: ProductoListado[];
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  filtros: Filtros;
  resumen: string | null;
  sinResultados: boolean;
  paginacion: ReturnType<typeof usePaginacion>;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  gestiona: boolean;
  onNuevo: (categoria: CategoriaAlta) => void;
  onEditar: AlEditar;
  onDadoDeBaja: () => void;
}

/** Tarjeta del listado según el patrón de la guía: barra, filtros, tabla y pie. */
function ListadoDeProductos({
  items,
  filtrados,
  estado,
  onCambiarEstado,
  filtros,
  resumen,
  sinResultados,
  paginacion,
  cargando,
  error,
  onReintentar,
  gestiona,
  onNuevo,
  onEditar,
  onDadoDeBaja,
}: ListadoDeProductosProps) {
  return (
    <TarjetaDelListado>
      <BarraDelListado
        filtros={filtros}
        items={items}
        estado={estado}
        onCambiarEstado={onCambiarEstado}
        filtrados={filtrados}
        gestiona={gestiona}
        onNuevo={onNuevo}
      />
      <CuerpoDelListado
        resumen={resumen}
        sinResultados={sinResultados}
        onLimpiarFiltros={filtros.limpiar}
        filtrados={filtrados}
        estado={estado}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        gestiona={gestiona}
        onEditar={onEditar}
        onDadoDeBaja={onDadoDeBaja}
      />
      <PieCondicional
        filtrosActivos={filtros.filtrosActivos}
        paginacion={paginacion}
        cantidadFilas={items.length}
      />
    </TarjetaDelListado>
  );
}

export function ProductosTab({ onIrASecciones }: ProductosTabProps) {
  const { puede } = useSesion();
  const gestiona = puede('CARTA_GESTIONAR');
  const [dialogo, setDialogo] = useState<DialogoAbierto | null>(null);
  const filtros = useFiltrosLocales();
  const { estado, cambiarEstado, paginacion, productos, items, total, alDarDeBaja } =
    useListadoProductos(filtros.filtrosActivos);
  const filtrados = filtrarProductos(items, filtros.busqueda, filtros.categoria, filtros.seccionId);

  const cerrarDialogo = useCallback((abierto: boolean) => !abierto && setDialogo(null), []);
  const cerrarYLuego = (accion?: () => void) => {
    setDialogo(null);
    accion?.();
  };
  const sinResultados =
    filtros.filtrosActivos && !productos.cargando && productos.error === null && items.length > 0;

  return (
    <>
      <ListadoDeProductos
        items={items}
        filtrados={filtrados}
        estado={estado}
        onCambiarEstado={cambiarEstado}
        filtros={filtros}
        resumen={
          filtros.filtrosActivos ? textoResultado(filtrados.length, items.length, total) : null
        }
        sinResultados={sinResultados && filtrados.length === 0}
        paginacion={paginacion}
        cargando={productos.cargando}
        error={productos.error}
        onReintentar={productos.recargar}
        gestiona={gestiona}
        onNuevo={(categoria) => setDialogo({ categoria })}
        onEditar={(categoria, productoId) => setDialogo({ categoria, productoId })}
        onDadoDeBaja={alDarDeBaja}
      />

      <DialogoDelTab
        dialogo={dialogo}
        onGuardado={() => cerrarYLuego(productos.recargar)}
        onDadoDeBaja={() => cerrarYLuego(alDarDeBaja)}
        onIrASecciones={() => cerrarYLuego(onIrASecciones)}
        onOpenChange={cerrarDialogo}
      />
    </>
  );
}
