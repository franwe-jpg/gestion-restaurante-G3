import { Link } from 'react-router-dom';

import { useSesion } from '../../auth/useSesion';

import { ENLACE_SECUNDARIO, ESTILO_ENLACE_BOTON } from './estilos';

/**
 * Enlaces reales: no dependen de la API y abren el alta con `?nueva=1`. Cada uno se muestra solo
 * si el rol puede operar esa pantalla.
 */
export function AccesosRapidos() {
  const { puede } = useSesion();

  return (
    <>
      {puede('COMANDAS_OPERAR') && (
        <Link to="/atencion?nueva=1" className={`${ESTILO_ENLACE_BOTON} ${ENLACE_SECUNDARIO}`}>
          Nueva comanda
        </Link>
      )}
      {puede('RESERVAS_OPERAR') && (
        <Link to="/reservas?nueva=1" className={`${ESTILO_ENLACE_BOTON} ${ENLACE_SECUNDARIO}`}>
          Nueva reserva
        </Link>
      )}
    </>
  );
}
