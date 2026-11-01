import { Card, CardContent } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import { ComandasTabla } from './ComandasTabla';
import { FiltrosComandas } from './FiltrosComandas';
import type { useComandas } from './useComandas';

export function ComandasPanel({
  comandas,
  aviso,
  onCerrar,
}: {
  comandas: ReturnType<typeof useComandas>;
  aviso: string;
  onCerrar: (id: number) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <FiltrosComandas ocupado={comandas.cargando} onFiltrar={comandas.filtrar} />
          {aviso && <p role="status">{aviso}</p>}
          {comandas.cargando && <Spinner etiqueta="Cargando comandas…" />}
          {!comandas.cargando && comandas.error && (
            <ErrorState descripcion={comandas.error} onReintentar={comandas.recargar} />
          )}
          {!comandas.cargando && !comandas.error && comandas.pagina && (
            <ComandasTabla
              pagina={comandas.pagina}
              hayFiltros={comandas.hayFiltros}
              ocupado={comandas.cargando}
              onCerrar={onCerrar}
              onPagina={comandas.cambiarPagina}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
