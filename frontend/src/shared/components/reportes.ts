/** Catálogo de reportes disponibles. Solo conoce rutas: no importa nada de los módulos. */
export interface ReporteDisponible {
  titulo: string;
  descripcion: string;
  ruta: string;
}

export const REPORTES: ReporteDisponible[] = [
  {
    titulo: 'Productos más vendidos',
    descripcion:
      'Los productos más pedidos de un período, con los días y las franjas horarias de más demanda.',
    ruta: '/reportes/productos-mas-vendidos',
  },
  {
    titulo: 'Reservas y ausentismo',
    descripcion:
      'Las reservas de un período según cómo terminaron y el porcentaje de clientes que no se presentaron.',
    ruta: '/reportes/reservas-ausentismo',
  },
  {
    titulo: 'Mesas atendidas y ventas por mozo',
    descripcion:
      'El desempeño de cada mozo en un período: mesas atendidas, ventas y promedio por mesa.',
    ruta: '/reportes/mesas-ventas-por-mozo',
  },
  {
    titulo: 'Impacto de promociones',
    descripcion:
      'Las ventas diarias de cada producto durante una promoción comparadas con las ventas fuera de ella.',
    ruta: '/reportes/impacto-promociones',
  },
  {
    titulo: 'Recaudación por medio de pago',
    descripcion:
      'Lo cobrado en un período por cada medio de pago y el total adeudado de las facturas del período.',
    ruta: '/reportes/recaudacion-por-medio-de-pago',
  },
];
