import { Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorPage } from './ErrorPage';
import { Button } from './ui/button';

export function ServiceUnavailablePage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      codigo={503}
      titulo="Servicio no disponible"
      descripcion="El sistema está en mantenimiento o no puede responder en este momento. Intentá nuevamente más tarde."
      icono={Wrench}
      tono="danger"
      acciones={
        <>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </>
      }
    />
  );
}
