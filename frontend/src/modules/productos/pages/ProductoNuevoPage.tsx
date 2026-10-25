import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Spinner } from '../../../shared/components/ui/spinner';
import { useApi } from '../../../shared/hooks/useApi';
import { listarSeccionesHabilitadas } from '../api';
import { CONFIGURACIONES } from '../categorias';
import type { CategoriaAlta } from '../categorias';
import { FormularioProducto } from '../components/FormularioProducto';
import { useFormularioProducto } from '../components/useFormularioProducto';

function migasDe(titulo: string) {
  return [{ etiqueta: 'Productos y Carta', ruta: '/productos' }, { etiqueta: titulo }];
}

export function ProductoNuevoPage({ categoria }: { categoria: CategoriaAlta }) {
  const configuracion = CONFIGURACIONES[categoria];
  const navigate = useNavigate();
  const consulta = useApi(listarSeccionesHabilitadas, 'secciones-habilitadas');
  const formulario = useFormularioProducto({
    categoria,
    onCreado: () => navigate('/productos'),
  });
  const secciones = (consulta.datos?.items ?? []).filter(
    (seccion) => seccion.estado === 'HABILITADO',
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs items={migasDe(configuracion.titulo)} />
      <PageHeader titulo={configuracion.titulo} />
      {consulta.cargando ? (
        <Spinner etiqueta="Cargando secciones..." />
      ) : (
        <FormularioProducto
          f={formulario}
          configuracion={configuracion}
          secciones={secciones}
          errorDeCarga={consulta.error}
        />
      )}
    </div>
  );
}
