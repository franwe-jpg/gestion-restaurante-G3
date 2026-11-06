import { useState } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import type { FacturaResumen } from '../types';

import { CobrarFacturaDialog } from './CobrarFacturaDialog';
import { ComprobantesDialog } from './ComprobantesDialog';
import { FacturasTabla } from './FacturasTabla';
import { useFacturasDelModulo } from './useFacturasDelModulo';

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
      <Card>
        <CardContent className="space-y-4 pt-6">
          <FacturasTabla
            facturas={listado.facturas}
            cargando={listado.cargando}
            error={listado.error}
            onReintentar={listado.recargar}
            onCobrar={setCobrando}
            onVerComprobantes={setViendo}
          />
          {listado.paginacion.totalPaginas > 1 && (
            <Pagination
              pagina={listado.paginacion.pagina}
              totalPaginas={listado.paginacion.totalPaginas}
              onCambiarPagina={listado.paginacion.irAPagina}
            />
          )}
        </CardContent>
      </Card>
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
