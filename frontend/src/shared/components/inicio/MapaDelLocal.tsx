import { useCallback, useState } from 'react';

import { useApi } from '../../hooks/useApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Spinner } from '../ui/spinner';

import { hoyLocal, obtenerMapaDelLocal } from './api';
import { DetalleDeMesaDialog } from './DetalleDeMesaDialog';
import { ErrorDelBloque } from './ErrorDelBloque';
import { FiltrosDelMapa } from './FiltrosDelMapa';
import { LeyendaDelMapa } from './LeyendaDelMapa';
import { agruparPorSector, contarPorEstado, filtrarMesas } from './mapaDelLocal';
import { PlanoDelLocal } from './PlanoDelLocal';
import type { FiltroDelMapa, MesaDelMapa } from './types';

const SIN_FILTRO: FiltroDelMapa = { estado: 'TODAS', sectorId: null };

function SinCoincidencias({ onQuitarFiltro }: { onQuitarFiltro: () => void }) {
  return (
    <div className="text-center text-sm text-slate-500">
      <p>No hay mesas con ese filtro</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onQuitarFiltro}>
        Quitar filtro
      </Button>
    </div>
  );
}

interface PlanoConDetalleProps {
  mesas: MesaDelMapa[];
  filtro: FiltroDelMapa;
}

/** Plano, leyenda y detalle de la mesa elegida (se marca en el plano mientras está abierto). */
function PlanoConDetalle({ mesas, filtro }: PlanoConDetalleProps) {
  const [elegida, setElegida] = useState<MesaDelMapa | null>(null);
  const cerrar = useCallback(() => setElegida(null), []);
  return (
    <>
      <PlanoDelLocal
        sectores={agruparPorSector(mesas)}
        sectorId={filtro.sectorId}
        estado={filtro.estado}
        seleccionadaId={elegida?.id ?? null}
        onElegir={setElegida}
      />
      <LeyendaDelMapa />
      <DetalleDeMesaDialog mesa={elegida} onCerrar={cerrar} />
    </>
  );
}

/** El sector elige qué zonas se dibujan; el estado no oculta mesas, atenúa las que no cumplen. */
function Mapa({ mesas }: { mesas: MesaDelMapa[] }) {
  const [filtro, setFiltro] = useState<FiltroDelMapa>(SIN_FILTRO);
  const delSector = filtrarMesas(mesas, { estado: 'TODAS', sectorId: filtro.sectorId });
  const sinCoincidencias = mesas.length > 0 && filtrarMesas(delSector, filtro).length === 0;

  return (
    <div className="space-y-4">
      <FiltrosDelMapa
        filtro={filtro}
        sectores={agruparPorSector(mesas)}
        cantidades={contarPorEstado(delSector)}
        total={delSector.length}
        onCambiar={setFiltro}
      />
      {mesas.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No hay mesas registradas</p>
      )}
      {sinCoincidencias && <SinCoincidencias onQuitarFiltro={() => setFiltro(SIN_FILTRO)} />}
      {mesas.length > 0 && <PlanoConDetalle mesas={mesas} filtro={filtro} />}
    </div>
  );
}

/** Mesas de hoy por sector, con su estado y las reservas activas del día (S4-06). */
export function MapaDelLocal() {
  const mapa = useApi(() => obtenerMapaDelLocal(hoyLocal()), 'mapa-del-local');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa del local</CardTitle>
      </CardHeader>
      <CardContent>
        {mapa.cargando && <Spinner />}
        {!mapa.cargando && mapa.error !== null && (
          <ErrorDelBloque mensaje={mapa.error} onReintentar={mapa.recargar} />
        )}
        {!mapa.cargando && mapa.error === null && mapa.datos !== null && (
          <Mapa mesas={mapa.datos} />
        )}
      </CardContent>
    </Card>
  );
}
