import { CalendarPlus, ClipboardPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ENLACE_PRIMARIO, ENLACE_SECUNDARIO, ESTILO_ENLACE_BOTON } from './estilos';

/** Enlaces reales: no dependen de la API y abren el alta con `?nueva=1`. */
export function AccesosRapidos() {
  return (
    <>
      <Link to="/atencion?nueva=1" className={`${ESTILO_ENLACE_BOTON} ${ENLACE_PRIMARIO}`}>
        <ClipboardPlus className="h-4 w-4" aria-hidden="true" />
        Nueva comanda
      </Link>
      <Link to="/reservas?nueva=1" className={`${ESTILO_ENLACE_BOTON} ${ENLACE_SECUNDARIO}`}>
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Nueva reserva
      </Link>
    </>
  );
}
