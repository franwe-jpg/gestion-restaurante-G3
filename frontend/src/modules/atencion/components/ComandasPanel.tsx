import type { ComponentProps } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { Alert } from '../../../shared/components/ui/alert';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import { ComandasTabla } from './ComandasTabla';
import { FiltrosComandas } from './FiltrosComandas';
import type { useComandas } from './useComandas';
import { useCatalogoComanda } from './useCatalogoComanda';

type AccionesDelListado = Omit<
  ComponentProps<typeof ComandasTabla>,
  'pagina' | 'mozos' | 'hayFiltros' | 'ocupado' | 'onPagina'
>;

type MozosDelCatalogo = ReturnType<typeof useCatalogoComanda>['mozos'];

interface Props extends AccionesDelListado {
  comandas: ReturnType<typeof useComandas>;
  aviso: string;
}

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

function ResultadoComandas({
  comandas,
  mozos,
  ...acciones
}: AccionesDelListado & { comandas: ReturnType<typeof useComandas>; mozos: MozosDelCatalogo }) {
  if (comandas.cargando) return <Spinner etiqueta="Cargando comandas…" />;
  if (comandas.error) {
    return <ErrorState descripcion={comandas.error} onReintentar={comandas.recargar} />;
  }
  if (!comandas.pagina) return null;
  return (
    <ComandasTabla
      pagina={comandas.pagina}
      mozos={mozos}
      hayFiltros={comandas.hayFiltros}
      ocupado={comandas.cargando}
      onPagina={comandas.cambiarPagina}
      {...acciones}
    />
  );
}

export function ComandasPanel({ comandas, aviso, ...acciones }: Props) {
  const catalogoMozos = useCatalogoComanda({
    conMozos: true,
    soloMozos: true,
    incluirMozosDeshabilitados: true,
  });
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <FiltrosComandas ocupado={comandas.cargando} onFiltrar={comandas.filtrar} />
          {aviso && <p role="status">{aviso}</p>}
          <EstadoCatalogoMozos cargando={catalogoMozos.cargando} error={catalogoMozos.error} />
          <ResultadoComandas comandas={comandas} mozos={catalogoMozos.mozos} {...acciones} />
        </div>
      </CardContent>
    </Card>
  );
}
