import { Link } from 'react-router-dom';

import { useApi } from '../../hooks/useApi';
import { formatearMoneda } from '../../lib/format';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';

import { obtenerComandaAbierta } from './api';
import { horaDelDia } from './detalleDeMesa';
import { ErrorDelBloque } from './ErrorDelBloque';
import { ENLACE_SECUNDARIO, ESTILO_ENLACE_BOTON } from './estilos';
import type { ComandaDeMesa } from './types';

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{titulo}</div>
      <div className="text-base font-bold text-slate-900">{valor}</div>
    </div>
  );
}

function Entregas({ comanda }: { comanda: ComandaDeMesa }) {
  const porcentaje =
    comanda.unidades === 0 ? 0 : (comanda.unidadesEntregadas / comanda.unidades) * 100;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-slate-600">Entregados</span>
        <span className="font-bold">
          {comanda.unidadesEntregadas} de {comanda.unidades}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-200" aria-hidden="true">
        <div className="h-full rounded bg-green-400" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

function DetalleDeComanda({ comanda }: { comanda: ComandaDeMesa }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Dato titulo="Comanda" valor={`N° ${comanda.id}`} />
        <Dato titulo="Empezó" valor={`${horaDelDia(comanda.fechaHora)} h`} />
      </div>
      <Entregas comanda={comanda} />
      <ul className="divide-y divide-slate-100 text-sm">
        {comanda.lineas.map((linea, indice) => (
          <li key={indice} className="flex items-center justify-between gap-3 py-2">
            <span>{`${linea.cantidad}× ${linea.nombre}`}</span>
            <span className="flex shrink-0 items-center gap-3">
              <Badge variant={linea.entregado ? 'success' : 'warning'}>
                {linea.entregado ? 'Entregado' : 'Pendiente'}
              </Badge>
              <span className="min-w-20 text-right tabular-nums">
                {formatearMoneda(linea.importe)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">Total a pagar</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">
          {formatearMoneda(comanda.total)}
        </span>
      </div>
      <Link to="/atencion" className={`${ESTILO_ENLACE_BOTON} ${ENLACE_SECUNDARIO} w-full`}>
        Ver comanda
      </Link>
    </div>
  );
}

/** Comanda abierta de una mesa ocupada; se pide al abrir el detalle. */
export function ComandaDeLaMesa({ mesaId }: { mesaId: number }) {
  const consulta = useApi(() => obtenerComandaAbierta(mesaId), `comanda-de-mesa-${mesaId}`);
  if (consulta.cargando) return <Spinner />;
  if (consulta.error !== null) {
    return <ErrorDelBloque mensaje={consulta.error} onReintentar={consulta.recargar} />;
  }
  if (consulta.datos === null) {
    return (
      <p className="text-sm text-slate-600">No se encontró una comanda abierta para esta mesa.</p>
    );
  }
  return <DetalleDeComanda comanda={consulta.datos} />;
}
