import { cumpleEstado } from './logicaMapaDelLocal';
import { ContornoDelPlano } from './ContornoDelPlano';
import { MesaDelMapa } from './MesaDelMapa';
import {
  ANCHO_POR_DEFECTO,
  asignarTipos,
  escalaDelPlano,
  generarPlano,
} from './logicaPlanoDelLocal';
import type { Ambiente, FiltroEstado, MesaDelMapa as Mesa, SectorDelMapa } from './types';
import { useAnchoDelElemento } from './useAnchoDelElemento';

export interface PlanoDelLocalProps {
  /** Todos los sectores: el tipo de ambiente de cada uno no cambia al filtrar. */
  sectores: SectorDelMapa[];
  sectorId: number | null;
  estado: FiltroEstado;
  seleccionadaId: number | null;
  onElegir: (mesa: Mesa) => void;
}

interface AmbienteDelPlanoProps extends Pick<
  PlanoDelLocalProps,
  'estado' | 'seleccionadaId' | 'onElegir'
> {
  ambiente: Ambiente;
  escala: number;
}

function AmbienteDelPlano({
  ambiente,
  estado,
  escala,
  seleccionadaId,
  onElegir,
}: AmbienteDelPlanoProps) {
  return (
    <section className="contents">
      <h3
        className="absolute text-[11px] leading-none font-bold tracking-[.08em] text-gray-500 uppercase"
        style={{ left: ambiente.etiqueta.x, top: ambiente.etiqueta.y }}
      >
        {ambiente.sector.nombre}
      </h3>
      {ambiente.mesas.map((posicion) => (
        <MesaDelMapa
          key={posicion.mesa.id}
          posicion={posicion}
          escala={escala}
          atenuada={!cumpleEstado(posicion.mesa, estado)}
          seleccionada={posicion.mesa.id === seleccionadaId}
          onElegir={onElegir}
        />
      ))}
    </section>
  );
}

/**
 * Plano generado del local, como un croquis de arquitecto (ver `planoDelLocal.ts`). Con todos
 * los sectores es compacto; con uno solo se dibuja ese ambiente, más grande.
 */
export function PlanoDelLocal({
  sectores,
  sectorId,
  estado,
  seleccionadaId,
  onElegir,
}: PlanoDelLocalProps) {
  const { ref, ancho: medido } = useAnchoDelElemento<HTMLDivElement>();
  const ancho = medido > 0 ? medido : ANCHO_POR_DEFECTO;
  const compacto = sectorId === null;
  const escala = escalaDelPlano(ancho, compacto);
  const tipos = asignarTipos(sectores);
  const visibles = compacto ? tipos : tipos.filter((sector) => sector.id === sectorId);
  const plano = generarPlano(visibles, ancho, escala);

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Plano del local"
      data-compacto={String(compacto)}
      className="relative w-full overflow-hidden"
      style={{ height: plano.alto }}
    >
      <ContornoDelPlano plano={plano} />
      {plano.ambientes.map((ambiente) => (
        <AmbienteDelPlano
          key={ambiente.sector.id}
          ambiente={ambiente}
          estado={estado}
          escala={escala}
          seleccionadaId={seleccionadaId}
          onElegir={onElegir}
        />
      ))}
    </div>
  );
}
