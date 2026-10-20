import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

import { obtenerSalud } from '../api';
import type { EstadoServicio, RespuestaApi } from '../types';
import { PageHeader } from './PageHeader';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function EstadoBackend() {
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState<EstadoServicio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aplicarRespuesta = useCallback((respuesta: RespuestaApi<EstadoServicio>) => {
    if (respuesta.exito && respuesta.datos) {
      setDatos(respuesta.datos);
      setError(null);
    } else {
      setError(respuesta.error ?? 'No fue posible conectar con el servicio backend.');
      setDatos(null);
    }
    setCargando(false);
  }, []);

  const consultarSalud = useCallback(async () => {
    setCargando(true);
    setError(null);
    aplicarRespuesta(await obtenerSalud());
  }, [aplicarRespuesta]);

  useEffect(() => {
    let activo = true;

    void obtenerSalud().then((respuesta) => {
      if (activo) {
        aplicarRespuesta(respuesta);
      }
    });

    return () => {
      activo = false;
    };
  }, [aplicarRespuesta]);

  const servicioActivo = datos?.estado === 'ok';

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Estado del Backend"
        descripcion="Monitoreo de conectividad y estado operativo de la API gastronómica."
        acciones={
          <Button
            variant="outline"
            size="sm"
            onClick={consultarSalud}
            disabled={cargando}
            aria-label="Reintentar verificación de estado"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar estado
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-700" />
              <CardTitle>Diagnóstico del servidor</CardTitle>
            </div>
            {cargando && <Badge variant="neutral">Verificando...</Badge>}
            {!cargando && servicioActivo && <Badge variant="success">Servicio activo</Badge>}
            {!cargando && datos && !servicioActivo && (
              <Badge variant="warning">Estado: {datos.estado}</Badge>
            )}
            {!cargando && error && <Badge variant="danger">Sin conexión</Badge>}
          </div>
          <CardDescription>Respuesta de verificación de salud del backend.</CardDescription>
        </CardHeader>

        <CardContent>
          {cargando ? (
            <p className="text-sm text-slate-500">Consultando /api/v1/salud...</p>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">
                    Error al contactar el backend
                  </h4>
                  <p className="mt-1 text-xs text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : datos ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Estado del servicio: {datos.estado}</span>
              </div>
              {datos.mensaje && <p className="text-xs text-slate-500">{datos.mensaje}</p>}
              {datos.version && (
                <p className="text-xs text-slate-500">Versión de API: {datos.version}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Sin información de respuesta disponible.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
