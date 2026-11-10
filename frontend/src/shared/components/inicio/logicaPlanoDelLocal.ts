// Plano generado del local (S4-06). `Mesa` no guarda posición ni el local tiene geometría, así que
// el contorno se arma con reglas fijas: salón con entrada, cocina y barra; salas rectangulares
// que alternan de lado; terraza con baranda curva. Todo en px del plano.
import { formaDeMesa } from './logicaMapaDelLocal';
import type {
  Abertura,
  Ambiente,
  Bloque,
  FormaMesa,
  GrillaDeMesas,
  MesaDelMapa,
  PlanoGenerado,
  PosicionEnPlano,
  Punto,
  Puerta,
  Rect,
  SectorConTipo,
  SectorDelMapa,
  Segmento,
  TramosDePared,
} from './types';

export const ANCHO_POR_DEFECTO = 640;
const ANCHO_ANGOSTO = 480;
const MARGEN = 8;
const RELLENO = 10;
const ALTO_FILA = 130;
const ALTO_ETIQUETA = 26;
const HUECO_ENTRE_MESAS = 12;
const EXTERIOR = /terraza|patio|jard[ií]n|vereda|exterior|deck/i;

/** Ancho de cada forma con sus sillas (ver `MesaDelMapa`). */
const ANCHO_CON_SILLAS: Record<FormaMesa, number> = {
  redonda: 86,
  cuadrada: 96,
  rectangular: 136,
  larga: 168,
};

const ABAJO: Punto = { x: 0, y: 1 };
const ARRIBA: Punto = { x: 0, y: -1 };
const DERECHA: Punto = { x: 1, y: 0 };
const IZQUIERDA: Punto = { x: -1, y: 0 };

interface Marco {
  x: number;
  y: number;
  ancho: number;
  escala: number;
  /** Ambiente de arriba, con el que comparte pared; `null` si es el primero. */
  anterior: Rect | null;
  /** Si es el último: cierra el contorno con su pared de abajo. */
  cierra: boolean;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, Math.round(valor)));
}

export function escalaDelPlano(ancho: number, compacto: boolean): number {
  const angosto = ancho < ANCHO_ANGOSTO;
  if (compacto) return angosto ? 0.6 : 0.78;
  return angosto ? 0.75 : 1;
}

/**
 * Salón = el sector interior con más mesas; terraza = el primero con nombre de exterior (o el
 * primero que queda); el resto son salas. Orden del plano: salón, salas, terraza.
 */
export function asignarTipos(sectores: SectorDelMapa[]): SectorConTipo[] {
  const porNombre = [...sectores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (porNombre.length === 0) return [];
  const interiores = porNombre.filter((s) => !EXTERIOR.test(s.nombre));
  const candidatos = interiores.length > 0 ? interiores : porNombre;
  const salon = candidatos.reduce((mayor, s) => (s.mesas.length > mayor.mesas.length ? s : mayor));
  const resto = porNombre.filter((s) => s !== salon);
  const terraza = resto.find((s) => EXTERIOR.test(s.nombre)) ?? resto[0];
  return [
    { ...salon, tipo: 'salon' },
    ...resto.filter((s) => s !== terraza).map((s) => ({ ...s, tipo: 'sala' as const })),
    ...(terraza === undefined ? [] : [{ ...terraza, tipo: 'terraza' as const }]),
  ];
}

function anchoMayor(mesas: MesaDelMapa[]): number {
  const anchos = mesas.map((m) => ANCHO_CON_SILLAS[formaDeMesa(m.capacidad).forma]);
  return Math.max(ANCHO_CON_SILLAS.redonda, ...anchos);
}

/**
 * Grilla por número: 3 columnas si son más de 6 mesas y 2 si no, menos si no entran en el ancho.
 * Cada mesa queda en el centro de su celda; posiciones relativas al área.
 */
export function distribuirEnArea(
  mesas: MesaDelMapa[],
  ancho: number,
  escala: number,
): GrillaDeMesas {
  const ordenadas = [...mesas].sort((a, b) => a.numero - b.numero);
  const caben = Math.floor(ancho / ((anchoMayor(ordenadas) + HUECO_ENTRE_MESAS) * escala));
  const columnas = Math.max(1, Math.min(ordenadas.length > 6 ? 3 : 2, caben));
  const filas = Math.ceil(ordenadas.length / columnas);
  const fila = ALTO_FILA * escala;
  const posiciones = ordenadas.map((mesa, indice) => ({
    mesa,
    x: (((indice % columnas) + 0.5) * ancho) / columnas,
    y: (Math.floor(indice / columnas) + 0.5) * fila,
  }));
  return { columnas, filas, alto: filas * fila, posiciones };
}

/** Hoja perpendicular a la pared, hacia `adentro`, y arco de giro hasta el otro lado del vano. */
export function dibujarPuerta(hueco: Segmento, adentro: Punto): Puerta {
  const { desde: bisagra, hasta: otro } = hueco;
  const radio = Math.hypot(otro.x - bisagra.x, otro.y - bisagra.y);
  const extremo = { x: bisagra.x + adentro.x * radio, y: bisagra.y + adentro.y * radio };
  const giro =
    (extremo.x - bisagra.x) * (otro.y - bisagra.y) - (extremo.y - bisagra.y) * (otro.x - bisagra.x);
  return {
    hoja: { desde: bisagra, hasta: extremo },
    arco: `M ${extremo.x} ${extremo.y} A ${radio} ${radio} 0 0 ${giro > 0 ? 1 : 0} ${otro.x} ${otro.y}`,
  };
}

/** Corta una pared recta en tramos, dejando huecos para puertas, ventanas y pasos. */
export function partirPared(pared: Segmento, aberturas: Abertura[], adentro: Punto): TramosDePared {
  const largo = Math.hypot(pared.hasta.x - pared.desde.x, pared.hasta.y - pared.desde.y);
  const en = (distancia: number): Punto => ({
    x: pared.desde.x + ((pared.hasta.x - pared.desde.x) * distancia) / largo,
    y: pared.desde.y + ((pared.hasta.y - pared.desde.y) * distancia) / largo,
  });
  const tramos: TramosDePared = { paredes: [], puertas: [], ventanas: [] };
  let inicio = 0;
  for (const abertura of [...aberturas].sort((a, b) => a.centro - b.centro)) {
    const desde = abertura.centro - abertura.ancho / 2;
    const hueco = { desde: en(desde), hasta: en(desde + abertura.ancho) };
    if (desde > inicio) tramos.paredes.push({ desde: en(inicio), hasta: hueco.desde });
    if (abertura.tipo === 'ventana') tramos.ventanas.push(hueco);
    if (abertura.tipo === 'puerta') tramos.puertas.push(dibujarPuerta(hueco, adentro));
    inicio = desde + abertura.ancho;
  }
  if (inicio < largo) tramos.paredes.push({ desde: en(inicio), hasta: pared.hasta });
  return tramos;
}

function juntar(...grupos: TramosDePared[]): TramosDePared {
  return {
    paredes: grupos.flatMap((g) => g.paredes),
    puertas: grupos.flatMap((g) => g.puertas),
    ventanas: grupos.flatMap((g) => g.ventanas),
  };
}

function pared(desde: Punto, hasta: Punto, adentro: Punto, aberturas: Abertura[] = []) {
  return partirPared({ desde, hasta }, aberturas, adentro);
}

/** Ventana en `centro`, proporcional al `largo` libre de la pared y de hasta `maximo` px. */
function ventana(centro: number, largo: number, maximo: number): Abertura[] {
  const ancho = Math.min(maximo, largo * 0.35);
  return ancho < 16 ? [] : [{ centro, ancho, tipo: 'ventana' }];
}

function ventanaCentrada(largo: number, maximo: number): Abertura[] {
  return ventana(largo / 2, largo, maximo);
}

function anchoDePuerta(escala: number): number {
  return Math.round(26 * escala + 10);
}

/**
 * Pared de arriba: si hay un ambiente encima, la parte común es interior y lleva la abertura (a
 * `fraccion` de su largo); lo que sobresale de uno u otro es exterior. Si no, es toda exterior.
 */
function paredDeArriba(marco: Marco, abertura: Omit<Abertura, 'centro'>, fraccion: number) {
  const { x, y, ancho, anterior } = marco;
  const izquierda = anterior === null ? x : Math.max(x, anterior.x);
  const derecha = anterior === null ? x + ancho : Math.min(x + ancho, anterior.x + anterior.ancho);
  const comun = pared({ x: izquierda, y }, { x: derecha, y }, ABAJO, [
    { ...abertura, centro: (derecha - izquierda) * fraccion },
  ]);
  if (anterior === null) return { exterior: comun, interiores: [] };
  const inicio = Math.min(x, anterior.x);
  const fin = Math.max(x + ancho, anterior.x + anterior.ancho);
  const sobrantes = [
    ...(inicio < izquierda ? [{ desde: { x: inicio, y }, hasta: { x: izquierda, y } }] : []),
    ...(fin > derecha ? [{ desde: { x: derecha, y }, hasta: { x: fin, y } }] : []),
  ];
  return { exterior: { ...comun, paredes: sobrantes }, interiores: comun.paredes };
}

function desplazar(posiciones: PosicionEnPlano[], area: Punto): PosicionEnPlano[] {
  return posiciones.map((p) => ({ ...p, x: area.x + p.x, y: area.y + p.y }));
}

function rectangulo({ x, y, ancho, alto }: Rect): string {
  return `M ${x} ${y} H ${x + ancho} V ${y + alto} H ${x} Z`;
}

/** Cocina rayada en la esquina de arriba a la derecha y barra a lo largo de la pared de arriba. */
function bloquesDelSalon(marco: Marco, banda: number, inicioBarra: number): Bloque[] {
  const { x, y, ancho, escala } = marco;
  const anchoCocina = limitar(ancho * 0.26, 72, 170);
  const cocina: Bloque = {
    tipo: 'cocina',
    nombre: 'Cocina',
    x: x + ancho - anchoCocina,
    y,
    ancho: anchoCocina,
    alto: banda - 14,
  };
  const barra: Bloque = {
    tipo: 'barra',
    nombre: 'Barra',
    x: inicioBarra,
    y: y + 10,
    ancho: Math.max(0, cocina.x - 14 - inicioBarra),
    alto: Math.round(10 * escala + 6),
  };
  return [cocina, barra];
}

function paredesDeLaCocina(cocina: Rect): TramosDePared {
  const abajo = cocina.y + cocina.alto;
  const paso: Abertura = {
    centro: cocina.ancho * 0.3,
    ancho: Math.min(28, cocina.ancho * 0.3),
    tipo: 'paso',
  };
  return juntar(
    pared({ x: cocina.x, y: cocina.y }, { x: cocina.x, y: abajo }, IZQUIERDA),
    pared({ x: cocina.x, y: abajo }, { x: cocina.x + cocina.ancho, y: abajo }, ARRIBA, [paso]),
  );
}

interface Muesca {
  ancho: number;
  alto: number;
}

/**
 * Contorno en L del salón: la esquina de arriba a la izquierda es un retiro exterior con la puerta
 * de entrada; ventanas en los costados y abajo si cierra el plano.
 */
function contornoDelSalon(marco: Marco, muesca: Muesca, cocina: Rect, abajo: number) {
  const { x, y, ancho, escala } = marco;
  const derecha = x + ancho;
  const alto = abajo - y;
  const libre = alto - cocina.alto;
  const entrada: Abertura = {
    centro: muesca.alto / 2,
    ancho: Math.min(muesca.alto - 10, anchoDePuerta(escala)),
    tipo: 'puerta',
  };
  return juntar(
    pared({ x: x + muesca.ancho, y }, { x: derecha, y }, ABAJO),
    pared(
      { x: derecha, y },
      { x: derecha, y: abajo },
      IZQUIERDA,
      ventana(cocina.alto + libre / 2, libre, 56),
    ),
    marco.cierra
      ? pared({ x: derecha, y: abajo }, { x, y: abajo }, ARRIBA, ventanaCentrada(ancho, 64))
      : { paredes: [], puertas: [], ventanas: [] },
    pared(
      { x, y: abajo },
      { x, y: y + muesca.alto },
      DERECHA,
      ventanaCentrada(alto - muesca.alto, 56),
    ),
    pared({ x, y: y + muesca.alto }, { x: x + muesca.ancho, y: y + muesca.alto }, ABAJO),
    pared({ x: x + muesca.ancho, y: y + muesca.alto }, { x: x + muesca.ancho, y }, DERECHA, [
      entrada,
    ]),
  );
}

const SIN_TRAMOS: TramosDePared = { paredes: [], puertas: [], ventanas: [] };

function generarSalon(sector: SectorConTipo, marco: Marco): Ambiente {
  const { x, y, ancho, escala } = marco;
  const banda = Math.round(70 * escala + 20);
  const muesca = { ancho: limitar(ancho * 0.18, 48, 110), alto: Math.round(banda * 0.65) };
  const area = { x: x + RELLENO, y: y + banda + 6, ancho: ancho - 2 * RELLENO };
  const grilla = distribuirEnArea(sector.mesas, area.ancho, escala);
  const abajo = area.y + grilla.alto + RELLENO;
  const bloques = bloquesDelSalon(marco, banda, x + muesca.ancho + anchoDePuerta(escala) + 16);
  const cocina = bloques[0] as Bloque;
  const piso = `M ${x + muesca.ancho} ${y} H ${x + ancho} V ${abajo} H ${x} V ${y + muesca.alto} H ${x + muesca.ancho} Z`;
  return {
    sector,
    tipo: 'salon',
    ...contornoDelSalon(marco, muesca, cocina, abajo),
    paredesInteriores: paredesDeLaCocina(cocina).paredes,
    baranda: null,
    bloques,
    entrada: { x: x + muesca.ancho / 2, y: y + muesca.alto / 2 },
    etiqueta: { x: x + 12, y: y + muesca.alto + 6 },
    piso,
    limites: { x, y, ancho, alto: abajo - y },
    area: { ...area, alto: grilla.alto },
    mesas: desplazar(grilla.posiciones, area),
  };
}

/** Sala rectangular: puerta en la pared que comparte con el ambiente de arriba, ventanas a los lados. */
function generarSala(sector: SectorConTipo, marco: Marco): Ambiente {
  const { x, y, ancho, escala } = marco;
  const area = { x: x + RELLENO, y: y + ALTO_ETIQUETA + 4, ancho: ancho - 2 * RELLENO };
  const grilla = distribuirEnArea(sector.mesas, area.ancho, escala);
  const abajo = area.y + grilla.alto + RELLENO;
  const alto = abajo - y;
  const arriba = paredDeArriba(marco, { ancho: anchoDePuerta(escala), tipo: 'puerta' }, 0.72);
  const contorno = juntar(
    arriba.exterior,
    pared({ x: x + ancho, y }, { x: x + ancho, y: abajo }, IZQUIERDA, ventanaCentrada(alto, 48)),
    marco.cierra ? pared({ x: x + ancho, y: abajo }, { x, y: abajo }, ARRIBA) : SIN_TRAMOS,
    pared({ x, y: abajo }, { x, y }, DERECHA, ventanaCentrada(alto, 48)),
  );
  const limites = { x, y, ancho, alto };
  return {
    sector,
    tipo: 'sala',
    ...contorno,
    paredesInteriores: arriba.interiores,
    baranda: null,
    bloques: [],
    entrada: null,
    etiqueta: { x: x + 12, y: y + 8 },
    piso: rectangulo(limites),
    limites,
    area: { ...area, alto: grilla.alto },
    mesas: desplazar(grilla.posiciones, area),
  };
}

/** Terraza al aire libre: paso desde el ambiente de arriba y baranda con el borde de abajo curvo. */
function generarTerraza(sector: SectorConTipo, marco: Marco): Ambiente {
  const { x, y, ancho, escala } = marco;
  const area = { x: x + RELLENO, y: y + ALTO_ETIQUETA + 4, ancho: ancho - 2 * RELLENO };
  const grilla = distribuirEnArea(sector.mesas, area.ancho, escala);
  const abajo = area.y + grilla.alto + 4;
  const curva = limitar(ancho * 0.1, 18, 48);
  const paso = { ancho: Math.min(96, ancho * 0.3), tipo: 'paso' as const };
  const arriba = paredDeArriba(marco, paso, 0.5);
  const baranda = `M ${x} ${y} V ${abajo} A ${ancho / 2} ${curva} 0 0 0 ${x + ancho} ${abajo} V ${y}`;
  return {
    sector,
    tipo: 'terraza',
    ...arriba.exterior,
    paredesInteriores: arriba.interiores,
    baranda,
    bloques: [],
    entrada: null,
    etiqueta: { x: x + 12, y: y + 8 },
    piso: `${baranda} Z`,
    limites: { x, y, ancho, alto: abajo + curva - y },
    area: { ...area, alto: grilla.alto },
    mesas: desplazar(grilla.posiciones, area),
  };
}

const GENERADORES = { salon: generarSalon, sala: generarSala, terraza: generarTerraza };

/** Las salas son más angostas y alternan de lado; la terraza sigue al ambiente de arriba. */
function horizontal(sector: SectorConTipo, total: Rect, anterior: Rect | null, sala: number) {
  if (sector.tipo === 'sala') {
    const ancho = Math.round(total.ancho * 0.84);
    return { x: sala % 2 === 0 ? total.x : total.x + total.ancho - ancho, ancho };
  }
  if (sector.tipo === 'terraza' && anterior !== null)
    return { x: anterior.x, ancho: anterior.ancho };
  return { x: total.x, ancho: total.ancho };
}

/** Apila los ambientes en el orden dado (ver `asignarTipos`), cada uno pegado al anterior. */
export function generarPlano(
  sectores: SectorConTipo[],
  ancho: number,
  escala: number,
): PlanoGenerado {
  const total = { x: MARGEN, y: MARGEN, ancho: ancho - 2 * MARGEN, alto: 0 };
  const ambientes: Ambiente[] = [];
  let anterior: Rect | null = null;
  let salas = 0;
  sectores.forEach((sector, indice) => {
    const y = anterior === null ? MARGEN : anterior.y + anterior.alto;
    const cierra = indice === sectores.length - 1;
    const marco = { ...horizontal(sector, total, anterior, salas), y, escala, anterior, cierra };
    if (sector.tipo === 'sala') salas += 1;
    const ambiente = GENERADORES[sector.tipo](sector, marco);
    ambientes.push(ambiente);
    anterior = ambiente.limites;
  });
  const fondo = Math.max(MARGEN, ...ambientes.map((a) => a.limites.y + a.limites.alto));
  return { ancho, alto: Math.ceil(fondo + MARGEN), ambientes };
}
