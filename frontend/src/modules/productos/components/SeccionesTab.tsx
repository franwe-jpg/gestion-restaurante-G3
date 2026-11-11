import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { useSesion } from '../../../shared/auth/useSesion';
import { Pagination } from '../../../shared/components/ui/pagination';
import { useApi } from '../../../shared/hooks/useApi';
import { usePaginacion } from '../../../shared/hooks/usePaginacion';
import { listarProductosHabilitados, listarSecciones } from '../api';
import type { SeccionListado } from '../types';

import { AccionesSeccion } from './AccionesSeccion';
import { SeccionFormDialog } from './SeccionFormDialog';
import { SeccionesTabla } from './SeccionesTabla';

const LIMITE_PAGINA = 50;

function EncabezadoSecciones({
  puedeCrear,
  onNueva,
}: {
  puedeCrear: boolean;
  onNueva: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        El orden define cómo aparecen las secciones en la carta.
      </p>
      {puedeCrear && (
        <Button onClick={onNueva}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva sección
        </Button>
      )}
    </div>
  );
}

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

  const alGuardar = () => {
    setDialogo(null);
    secciones.recargar();
    productos.recargar();
  };

  return (
    <div className="space-y-4">
      <EncabezadoSecciones puedeCrear={gestiona} onNueva={() => setDialogo({})} />

      <SeccionesTabla
        secciones={secciones.datos?.items ?? []}
        cargando={secciones.cargando}
        error={secciones.error}
        onReintentar={secciones.recargar}
        renderAcciones={
          gestiona
            ? renderizarAcciones((fila) => setDialogo({ seccion: fila }), secciones.recargar)
            : undefined
        }
      />

      <PaginacionDeSecciones paginacion={paginacion} />

      {dialogo && (
        <SeccionFormDialog
          productos={productos.datos?.items ?? []}
          seccion={dialogo.seccion}
          onGuardada={alGuardar}
          onOpenChange={(abierto) => !abierto && setDialogo(null)}
        />
      )}
    </div>
  );
}
