import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { useSesion } from '../../../shared/auth/useSesion';
import { Pagination } from '../../../shared/components/ui/pagination';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
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
        <Button key={categoria} onClick={() => onNuevo(categoria)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
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

  return { estado, cambiarEstado, paginacion, productos, items, alDarDeBaja };
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

export function ProductosTab({ onIrASecciones }: ProductosTabProps) {
  const { puede } = useSesion();
  const gestiona = puede('CARTA_GESTIONAR');
  const [dialogo, setDialogo] = useState<DialogoAbierto | null>(null);
  const { estado, cambiarEstado, paginacion, productos, items, alDarDeBaja } =
    useListadoProductos();

  const cerrarDialogo = useCallback((abierto: boolean) => !abierto && setDialogo(null), []);
  const cerrarYLuego = (accion?: () => void) => {
    setDialogo(null);
    accion?.();
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        acciones={
          gestiona ? <BotonesAlta onNuevo={(categoria) => setDialogo({ categoria })} /> : undefined
        }
      >
        <SelectorEstado estado={estado} onCambiar={cambiarEstado} />
      </TableToolbar>

      <ProductosTabla
        productos={items}
        filtro={filtroDe(estado)}
        cargando={productos.cargando}
        error={productos.error}
        onReintentar={productos.recargar}
        renderAcciones={
          gestiona
            ? renderizarAcciones(
                (categoria, productoId) => setDialogo({ categoria, productoId }),
                alDarDeBaja,
              )
            : undefined
        }
      />

      <PaginacionDelListado paginacion={paginacion} />

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
    </div>
  );
}
