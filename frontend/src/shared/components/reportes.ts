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
];
