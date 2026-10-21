import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ErrorPage } from './ErrorPage';
import { Button } from './ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <ErrorPage
      codigo={404}
      titulo="Página no encontrada"
      descripcion="La ruta que buscás no existe o el módulo todavía no está disponible."
      icono={Compass}
      tono="brand"
      acciones={<Button onClick={() => navigate('/')}>Volver al inicio</Button>}
    />
  );
}
