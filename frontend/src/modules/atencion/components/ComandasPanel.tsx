import type { ComponentProps } from 'react';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import { ComandasTabla } from './ComandasTabla';
import { FiltrosComandas } from './FiltrosComandas';
import type { useComandas } from './useComandas';

type AccionesDelListado = Omit<
  ComponentProps<typeof ComandasTabla>,
  'pagina' | 'hayFiltros' | 'ocupado' | 'onPagina'
>;

interface Props extends AccionesDelListado {
  comandas: ReturnType<typeof useComandas>;
  aviso: string;
}

function ResultadoComandas({
  comandas,
  ...acciones
}: AccionesDelListado & { comandas: ReturnType<typeof useComandas> }) {
  if (comandas.cargando) return <Spinner etiqueta="Cargando comandas…" />;
  if (comandas.error) {
    return <ErrorState descripcion={comandas.error} onReintentar={comandas.recargar} />;
  }
  if (!comandas.pagina) return null;
  return (
    <ComandasTabla
      pagina={comandas.pagina}
      hayFiltros={comandas.hayFiltros}
      ocupado={comandas.cargando}
      onPagina={comandas.cambiarPagina}
      {...acciones}
    />
  );
}

export function ComandasPanel({ comandas, aviso, ...acciones }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <FiltrosComandas ocupado={comandas.cargando} onFiltrar={comandas.filtrar} />
          {aviso && <p role="status">{aviso}</p>}
          <ResultadoComandas comandas={comandas} {...acciones} />
        </div>
      </CardContent>
    </Card>
  );
}
