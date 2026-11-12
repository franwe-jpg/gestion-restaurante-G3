import { Card, CardContent } from '../../../shared/components/ui/card';
import { Alert } from '../../../shared/components/ui/alert';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import { ComandasTabla } from './ComandasTabla';
import { FiltrosComandas } from './FiltrosComandas';
import type { useComandas } from './useComandas';
import { useCatalogoComanda } from './useCatalogoComanda';

function EstadoCatalogoMozos({ cargando, error }: { cargando: boolean; error: string | null }) {
  if (cargando) return <Spinner etiqueta="Cargando mozos…" />;
  if (error) {
    return (
      <Alert variant="warning">
        No se pudieron cargar los nombres de los mozos; se mostrarán sus identificadores.
      </Alert>
    );
  }
  return null;
}

interface ComandasPanelProps {
  comandas: ReturnType<typeof useComandas>;
  aviso: string;
  onCerrar: (id: number) => void;
  onEntregas: (id: number) => void;
  onModificar: (id: number) => void;
  onReabrir: (id: number) => void;
  onAnular: (id: number) => void;
  onFacturar: (id: number) => void;
}

function ContenidoComandas({
  comandas,
  aviso,
  mozos,
  cargandoMozos,
  errorMozos,
  onCerrar,
  onEntregas,
  onModificar,
  onReabrir,
  onAnular,
  onFacturar,
}: ComandasPanelProps & {
  mozos: ReturnType<typeof useCatalogoComanda>['mozos'];
  cargandoMozos: boolean;
  errorMozos: string | null;
}) {
  return (
    <div className="space-y-4">
      <FiltrosComandas ocupado={comandas.cargando} onFiltrar={comandas.filtrar} />
      {aviso && <p role="status">{aviso}</p>}
      <EstadoCatalogoMozos cargando={cargandoMozos} error={errorMozos} />
      {comandas.cargando && <Spinner etiqueta="Cargando comandas…" />}
      {!comandas.cargando && comandas.error && (
        <ErrorState descripcion={comandas.error} onReintentar={comandas.recargar} />
      )}
      {!comandas.cargando && !comandas.error && comandas.pagina && (
        <ComandasTabla
          pagina={comandas.pagina}
          mozos={mozos}
          hayFiltros={comandas.hayFiltros}
          ocupado={comandas.cargando}
          onCerrar={onCerrar}
          onEntregas={onEntregas}
          onModificar={onModificar}
          onReabrir={onReabrir}
          onAnular={onAnular}
          onFacturar={onFacturar}
          onPagina={comandas.cambiarPagina}
        />
      )}
    </div>
  );
}

export function ComandasPanel(props: ComandasPanelProps) {
  const catalogoMozos = useCatalogoComanda({
    conMozos: true,
    soloMozos: true,
    incluirMozosDeshabilitados: true,
  });
  return (
    <Card>
      <CardContent className="pt-6">
        <ContenidoComandas
          {...props}
          mozos={catalogoMozos.mozos}
          cargandoMozos={catalogoMozos.cargando}
          errorMozos={catalogoMozos.error}
        />
      </CardContent>
    </Card>
  );
}
