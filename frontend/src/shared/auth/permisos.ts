/**
 * Matriz espejo de `backend/app/shared/permisos.py`: es la unica del frontend.
 * Solo oculta lo que el rol no puede usar; la API siempre decide (403).
 */
export type Rol = 'ENCARGADO' | 'MOZO' | 'CHEF';

export type Permiso =
  | 'CARTA_VER'
  | 'CARTA_GESTIONAR'
  | 'MENUS_VER'
  | 'MENUS_GESTIONAR'
  | 'SALON_VER'
  | 'SALON_GESTIONAR'
  | 'COMANDAS_VER'
  | 'COMANDAS_OPERAR'
  | 'CLIENTES_GESTIONAR'
  | 'RESERVAS_VER'
  | 'RESERVAS_OPERAR'
  | 'PAGOS_OPERAR'
  | 'PAGOS_GESTIONAR'
  | 'REPORTES_VER';

export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  ENCARGADO: [
    'CARTA_VER',
    'CARTA_GESTIONAR',
    'MENUS_VER',
    'MENUS_GESTIONAR',
    'SALON_VER',
    'SALON_GESTIONAR',
    'COMANDAS_VER',
    'COMANDAS_OPERAR',
    'CLIENTES_GESTIONAR',
    'RESERVAS_VER',
    'RESERVAS_OPERAR',
    'PAGOS_OPERAR',
    'PAGOS_GESTIONAR',
    'REPORTES_VER',
  ],
  MOZO: [
    'CARTA_VER',
    'MENUS_VER',
    'SALON_VER',
    'COMANDAS_VER',
    'COMANDAS_OPERAR',
    'CLIENTES_GESTIONAR',
    'RESERVAS_VER',
    'RESERVAS_OPERAR',
    'PAGOS_OPERAR',
  ],
  CHEF: ['CARTA_VER', 'MENUS_VER', 'COMANDAS_VER', 'RESERVAS_VER'],
};

/** Union de los permisos de los roles; sin roles no hay permisos. */
export function permisosDe(roles: readonly Rol[]): Set<Permiso> {
  return new Set(roles.flatMap((rol) => PERMISOS_POR_ROL[rol]));
}
