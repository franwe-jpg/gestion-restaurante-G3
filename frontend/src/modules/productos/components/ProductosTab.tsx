import { useCallback, useState } from 'react';

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
import { ProductoFormDialog } from './ProductoFormDialog';
import { ProductosTabla } from './ProductosTabla';
import { SelectorEstado } from './SelectorEstado';

const LIMITE_PAGINA = 50;

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

/** Listado filtrado por estado y paginado (D-27). */
function useListadoProductos() {
  const [estado, setEstado] = useState<FiltroEstado>('HABILITADO');
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_PAGINA });
  const productos = useApi(
    () => listarProductos(estado, LIMITE_PAGINA, paginacion.offset),
    `productos-${estado}-${paginacion.offset}`,
  );

  const totalActual = productos.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  const items = productos.datos?.items ?? [];

  const cambiarEstado = (valor: FiltroEstado) => {
    setEstado(valor);
    paginacion.irAPagina(1);
  };

  const alDarDeBaja = () => {
    // Una página que queda vacía no se recarga: se retrocede (E22).
    if (items.length === 1 && paginacion.pagina > 1) paginacion.anterior();
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
  total: number;
}

/** Resumen del tramo visible y paginador; no se muestra si el listado está vacío. */
function PieDeProductos({ paginacion, cantidadFilas, total }: PieDeProductosProps) {
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

interface ListadoDeProductosProps {
  items: ProductoListado[];
  total: number;
  estado: FiltroEstado;
  onCambiarEstado: (estado: FiltroEstado) => void;
  paginacion: ReturnType<typeof usePaginacion>;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  gestiona: boolean;
  onNuevo: (categoria: CategoriaAlta) => void;
  onEditar: AlEditar;
  onDadoDeBaja: () => void;
}

/** Tarjeta del listado según el patrón de la guía: barra, tabla y pie de paginación. */
function ListadoDeProductos({
  items,
  total,
  estado,
  onCambiarEstado,
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
    <Card>
      <CardContent className="space-y-4 pt-6">
        <TableToolbar
          acciones={
            <>
              <ExportButton filas={items} nombreArchivo="productos" />
              {gestiona && <BotonesAlta onNuevo={onNuevo} />}
            </>
          }
        >
          <FilterBar className="border-0 p-0">
            <SelectorEstado estado={estado} onCambiar={onCambiarEstado} />
          </FilterBar>
        </TableToolbar>

        <ProductosTabla
          productos={items}
          filtro={filtroDe(estado)}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          renderAcciones={gestiona ? renderizarAcciones(onEditar, onDadoDeBaja) : undefined}
        />

        {total > 0 && (
          <PieDeProductos paginacion={paginacion} cantidadFilas={items.length} total={total} />
        )}
      </CardContent>
    </Card>
  );
}

export function ProductosTab({ onIrASecciones }: ProductosTabProps) {
  const { puede } = useSesion();
  const gestiona = puede('CARTA_GESTIONAR');
  const [dialogo, setDialogo] = useState<DialogoAbierto | null>(null);
  const { estado, cambiarEstado, paginacion, productos, items, total, alDarDeBaja } =
    useListadoProductos();

  const cerrarDialogo = useCallback((abierto: boolean) => !abierto && setDialogo(null), []);
  const cerrarYLuego = (accion?: () => void) => {
    setDialogo(null);
    accion?.();
  };

  return (
    <>
      <ListadoDeProductos
        items={items}
        total={total}
        estado={estado}
        onCambiarEstado={cambiarEstado}
        paginacion={paginacion}
        cargando={productos.cargando}
        error={productos.error}
        onReintentar={productos.recargar}
        gestiona={gestiona}
        onNuevo={(categoria) => setDialogo({ categoria })}
        onEditar={(categoria, productoId) => setDialogo({ categoria, productoId })}
        onDadoDeBaja={alDarDeBaja}
      />

      {dialogo && (
        <ProductoFormDialog
          categoria={dialogo.categoria}
          productoId={dialogo.productoId}
          onGuardado={() => cerrarYLuego(productos.recargar)}
          onDadoDeBaja={() => cerrarYLuego(alDarDeBaja)}
          onIrASecciones={() => cerrarYLuego(onIrASecciones)}
          onOpenChange={cerrarDialogo}
        />
      )}
    </>
  );
}
