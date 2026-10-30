import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../../shared/components/ui/button';
import { Pagination } from '../../../shared/components/ui/pagination';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import { listarProductos } from '../api';
import type { FiltroEstado } from '../types';

import { AccionesProducto } from './AccionesProducto';
import { filtroDe } from './filtrosEstado';
import { ProductosTabla } from './ProductosTabla';
import { SelectorEstado } from './SelectorEstado';

const LIMITE_PAGINA = 50;

function BotonesAlta() {
  const navigate = useNavigate();
  return (
    <>
      <Button onClick={() => navigate('/productos/platos/nuevo')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo plato
      </Button>
      <Button onClick={() => navigate('/productos/postres/nuevo')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo postre
      </Button>
      <Button onClick={() => navigate('/productos/bebidas/nuevo')}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva bebida
      </Button>
    </>
  );
}

export function ProductosTab() {
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

  return (
    <div className="space-y-4">
      <TableToolbar acciones={<BotonesAlta />}>
        <SelectorEstado estado={estado} onCambiar={cambiarEstado} />
      </TableToolbar>

      <ProductosTabla
        productos={items}
        filtro={filtroDe(estado)}
        cargando={productos.cargando}
        error={productos.error}
        onReintentar={productos.recargar}
        renderAcciones={(producto) => (
          <AccionesProducto producto={producto} onDadoDeBaja={alDarDeBaja} />
        )}
      />

      {paginacion.totalPaginas > 1 && (
        <Pagination
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          onCambiarPagina={paginacion.irAPagina}
        />
      )}
    </div>
  );
}
