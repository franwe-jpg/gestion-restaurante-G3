import { useState } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import { useSesion } from '../../../shared/auth/useSesion';
import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import { listarProductosHabilitados, listarSecciones } from '../api';
import type { SeccionListado } from '../types';

import { AccionesSeccion } from './AccionesSeccion';
import { SeccionFormDialog } from './SeccionFormDialog';
import { SeccionesTabla } from './SeccionesTabla';

const LIMITE_PAGINA = 50;

function PaginacionDeSecciones({ paginacion }: { paginacion: ReturnType<typeof usePaginacion> }) {
  if (paginacion.totalPaginas <= 1) return null;
  return (
    <Pagination
      pagina={paginacion.pagina}
      totalPaginas={paginacion.totalPaginas}
      onCambiarPagina={paginacion.irAPagina}
    />
  );
}

function renderizarAcciones(onEditar: (seccion: SeccionListado) => void, onDadoDeBaja: () => void) {
  return function AccionesDeLaFila(seccion: SeccionListado) {
    return <AccionesSeccion seccion={seccion} onEditar={onEditar} onDadoDeBaja={onDadoDeBaja} />;
  };
}

interface PieDeSeccionesProps {
  paginacion: ReturnType<typeof usePaginacion>;
  cantidadFilas: number;
  total: number;
}

/** Resumen del tramo visible y paginador; no se muestra si el listado está vacío. */
function PieDeSecciones({ paginacion, cantidadFilas, total }: PieDeSeccionesProps) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={paginacion.offset + 1}
        hasta={Math.min(paginacion.offset + cantidadFilas, total)}
        total={total}
        etiqueta="secciones"
        etiquetaSingular="sección"
      />
      <PaginacionDeSecciones paginacion={paginacion} />
    </div>
  );
}

interface ListadoDeSeccionesProps {
  items: SeccionListado[];
  total: number;
  paginacion: ReturnType<typeof usePaginacion>;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  gestiona: boolean;
  onNueva: () => void;
  onEditar: (seccion: SeccionListado) => void;
  onDadoDeBaja: () => void;
}

/** Tarjeta del listado según el patrón de la guía: barra, tabla y pie de paginación. */
function ListadoDeSecciones({
  items,
  total,
  paginacion,
  cargando,
  error,
  onReintentar,
  gestiona,
  onNueva,
  onEditar,
  onDadoDeBaja,
}: ListadoDeSeccionesProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <TableToolbar
          acciones={
            <>
              <ExportButton filas={items} nombreArchivo="secciones" />
              {gestiona && (
                <Button variant="brand-outline" onClick={onNueva}>
                  Nueva sección
                </Button>
              )}
            </>
          }
        >
          <p className="text-sm text-slate-600">
            El orden define cómo aparecen las secciones en la carta.
          </p>
        </TableToolbar>

        <SeccionesTabla
          secciones={items}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          renderAcciones={gestiona ? renderizarAcciones(onEditar, onDadoDeBaja) : undefined}
        />

        {total > 0 && (
          <PieDeSecciones paginacion={paginacion} cantidadFilas={items.length} total={total} />
        )}
      </CardContent>
    </Card>
  );
}

export function SeccionesTab() {
  const gestiona = useSesion().puede('CARTA_GESTIONAR');
  // `seccion` presente edita esa fila; sin ella, el diálogo crea una sección.
  const [dialogo, setDialogo] = useState<{ seccion?: SeccionListado } | null>(null);
  const [total, setTotal] = useState(0);
  const paginacion = usePaginacion({ total, limite: LIMITE_PAGINA });
  const secciones = useApi(
    () => listarSecciones(LIMITE_PAGINA, paginacion.offset),
    `secciones-${paginacion.offset}`,
  );
  const productos = useApi(listarProductosHabilitados, 'productos-habilitados');

  const totalActual = secciones.datos?.total ?? 0;
  if (totalActual !== total) setTotal(totalActual);

  const items = secciones.datos?.items ?? [];

  const alGuardar = () => {
    setDialogo(null);
    secciones.recargar();
    productos.recargar();
  };

  return (
    <>
      <ListadoDeSecciones
        items={items}
        total={total}
        paginacion={paginacion}
        cargando={secciones.cargando}
        error={secciones.error}
        onReintentar={secciones.recargar}
        gestiona={gestiona}
        onNueva={() => setDialogo({})}
        onEditar={(seccion) => setDialogo({ seccion })}
        onDadoDeBaja={secciones.recargar}
      />

      {dialogo && (
        <SeccionFormDialog
          productos={productos.datos?.items ?? []}
          seccion={dialogo.seccion}
          onGuardada={alGuardar}
          onOpenChange={(abierto) => !abierto && setDialogo(null)}
        />
      )}
    </>
  );
}
