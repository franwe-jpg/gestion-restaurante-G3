import { useState } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { Pagination } from '../../../shared/components/ui/pagination';
import { PaginationSummary } from '../../../shared/components/ui/pagination-summary';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';
import type { FacturaResumen } from '../types';

import { CobrarFacturaDialog } from './CobrarFacturaDialog';
import { ComprobantesDialog } from './ComprobantesDialog';
import { FacturasTabla } from './FacturasTabla';
import type { PaginacionFacturas } from './useFacturasDelModulo';
import { LIMITE_FACTURAS, useFacturasDelModulo } from './useFacturasDelModulo';

interface PieDelListadoProps {
  pagina: number;
  total: number;
  totalPaginas: number;
  cantidadFilas: number;
  onCambiarPagina: (pagina: number) => void;
}

/** Resumen del tramo visible y paginador; no se muestra si el listado está vacío. */
function PieDelListado({
  pagina,
  total,
  totalPaginas,
  cantidadFilas,
  onCambiarPagina,
}: PieDelListadoProps) {
  const offset = (pagina - 1) * LIMITE_FACTURAS;
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary
        desde={offset + 1}
        hasta={Math.min(offset + cantidadFilas, total)}
        total={total}
        etiqueta="facturas"
        etiquetaSingular="factura"
      />
      {totalPaginas > 1 && (
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={onCambiarPagina} />
      )}
    </div>
  );
}

interface ListadoDeFacturasProps {
  facturas: FacturaResumen[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onCobrar: (factura: FacturaResumen) => void;
  onVerComprobantes: (factura: FacturaResumen) => void;
  paginacion: PaginacionFacturas;
}

/** Tarjeta con el listado, el exportador y el pie de paginación. */
function ListadoDeFacturas({
  facturas,
  cargando,
  error,
  onReintentar,
  onCobrar,
  onVerComprobantes,
  paginacion,
}: ListadoDeFacturasProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <TableToolbar acciones={<ExportButton filas={facturas} nombreArchivo="facturas" />}>
          {null}
        </TableToolbar>
        <FacturasTabla
          facturas={facturas}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          onCobrar={onCobrar}
          onVerComprobantes={onVerComprobantes}
        />
        <PieDelListado
          pagina={paginacion.pagina}
          total={paginacion.total}
          totalPaginas={paginacion.totalPaginas}
          cantidadFilas={facturas.length}
          onCambiarPagina={paginacion.irAPagina}
        />
      </CardContent>
    </Card>
  );
}

/** HU-M6-02: pestaña «Facturas» con el listado y el cobro de las adeudadas; HU-M6-03: comprobantes. */
export function FacturasPanel() {
  const listado = useFacturasDelModulo();
  const [cobrando, setCobrando] = useState<FacturaResumen | null>(null);
  const [viendo, setViendo] = useState<FacturaResumen | null>(null);

  const alCobrar = () => {
    setCobrando(null);
    listado.recargar();
  };

  return (
    <>
      <ListadoDeFacturas
        facturas={listado.facturas}
        cargando={listado.cargando}
        error={listado.error}
        onReintentar={listado.recargar}
        onCobrar={setCobrando}
        onVerComprobantes={setViendo}
        paginacion={listado.paginacion}
      />
      {cobrando && (
        <CobrarFacturaDialog
          factura={cobrando}
          onCobrada={alCobrar}
          onOpenChange={(abierto) => {
            if (!abierto) setCobrando(null);
          }}
        />
      )}
      {viendo && (
        <ComprobantesDialog
          factura={viendo}
          onOpenChange={(abierto) => {
            if (!abierto) setViendo(null);
          }}
        />
      )}
    </>
  );
}
