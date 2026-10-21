import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorPage } from './ErrorPage';
import { Button } from './ui/button';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      codigo={403}
      titulo="Acceso denegado"
      descripcion="No tenés permisos para ver esta sección. Si creés que es un error, contactá al administrador."
      icono={ShieldX}
      tono="warning"
      acciones={
        <>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Volver atrás
          </Button>
        </>
      }
    />
  );
}
