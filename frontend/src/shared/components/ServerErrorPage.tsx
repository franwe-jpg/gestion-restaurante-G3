import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorPage } from './ErrorPage';
import { Button } from './ui/button';

export function ServerErrorPage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      codigo={500}
      titulo="Error interno del servidor"
      descripcion="Ocurrió un error inesperado. Podés reintentar en unos segundos o volver al inicio."
      icono={AlertTriangle}
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
