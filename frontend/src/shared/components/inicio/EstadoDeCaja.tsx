import { Link } from 'react-router-dom';

import { useApi } from '../../hooks/useApi';
import { formatearMoneda } from '../../lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Spinner } from '../ui/spinner';

import { obtenerCajaDelDia } from './api';
import { ErrorDelBloque } from './ErrorDelBloque';
import type { CajaDelDia } from './types';

const moneda = (monto: string) => formatearMoneda(Number(monto));

function textoDeuda(cantidad: number): string {
  if (cantidad === 0) return 'No hay facturas adeudadas';
  return `${cantidad} ${cantidad === 1 ? 'factura adeudada' : 'facturas adeudadas'}`;
}

function Caja({ caja }: { caja: CajaDelDia }) {
  const { adeudado } = caja;
  return (
    <div className="space-y-4">
      {caja.por_medio_pago.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay cobros hoy</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {caja.por_medio_pago.map((medio) => (
            <li key={medio.medio_pago_id} className="flex justify-between">
              <span>{medio.nombre}</span>
              <span>{moneda(medio.monto)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
        <span>Total cobrado</span>
        <span data-testid="total-cobrado">{moneda(caja.total_cobrado)}</span>
      </p>
      <p className="flex justify-between text-sm text-slate-600">
        <span>{textoDeuda(adeudado.cantidad_facturas)}</span>
        {adeudado.cantidad_facturas > 0 && <span>{moneda(adeudado.monto)}</span>}
      </p>
      <Link to="/pagos" className="text-sm font-medium text-amber-800 hover:underline">
        Ir a Pagos
      </Link>
    </div>
  );
}

/** Cobrado hoy por medio de pago y lo adeudado (S4-06). */
export function EstadoDeCaja() {
  const caja = useApi(obtenerCajaDelDia, 'caja-del-dia');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de la caja</CardTitle>
      </CardHeader>
      <CardContent>
        {caja.cargando && <Spinner />}
        {!caja.cargando && caja.error !== null && (
          <ErrorDelBloque mensaje={caja.error} onReintentar={caja.recargar} />
        )}
        {!caja.cargando && caja.error === null && caja.datos !== null && <Caja caja={caja.datos} />}
      </CardContent>
    </Card>
  );
}
