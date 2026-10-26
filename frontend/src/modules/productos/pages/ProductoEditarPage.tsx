import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import { Spinner } from '../../../shared/components/ui/spinner';
import { useApi } from '../../../shared/hooks/useApi';
import { listarSeccionesHabilitadas, obtenerProducto, urlDeImagen } from '../api';
import { CONFIGURACIONES, CONFIGURACIONES_EDICION } from '../categorias';
import type { CategoriaEdicion, ConfiguracionEdicion } from '../categorias';
import { FormularioProducto } from '../components/FormularioProducto';
import { seccionesParaEditar } from '../components/seccionesParaEditar';
import type { OpcionSeccion } from '../components/seccionesParaEditar';
import { useBajaProducto } from '../components/useBajaProducto';
import { useEdicionProducto } from '../components/useEdicionProducto';
import type { ProductoSalida } from '../types';

function idDeLaRuta(parametro: string | undefined): number | null {
  const id = Number(parametro);
  return /^\d+$/.test(parametro ?? '') && id > 0 ? id : null;
}

function mensajeDeCarga(error: string, configuracion: ConfiguracionEdicion): string {
  return /no existe/i.test(error) ? configuracion.noEncontrado : error;
}

interface EdicionCargadaProps {
  categoria: CategoriaEdicion;
  producto: ProductoSalida;
  secciones: OpcionSeccion[];
  errorDeCarga: string | null;
}

function EdicionCargada({ categoria, producto, secciones, errorDeCarga }: EdicionCargadaProps) {
  const navigate = useNavigate();
  const volver = () => navigate('/productos');
  const f = useEdicionProducto({ categoria, producto, onGuardado: volver });
  const baja = useBajaProducto({ categoria, producto, onDadoDeBaja: volver });
  const imagenVigente = f.quitarImagen ? null : urlDeImagen(producto.imagen_url);

  return (
    <FormularioProducto
      f={f}
      configuracion={{
        botonGuardar: CONFIGURACIONES_EDICION[categoria].botonGuardar,
        avisoSinSecciones: CONFIGURACIONES[categoria].avisoSinSecciones,
        ingredientesObligatorios: CONFIGURACIONES[categoria].ingredientesObligatorios,
      }}
      secciones={seccionesParaEditar(secciones, producto.seccion)}
      errorDeCarga={errorDeCarga}
      edicion={{
        estado: f.estado,
        onCambiarEstado: f.setEstado,
        imagenActual: imagenVigente,
        onQuitarImagenActual: () => f.setQuitarImagen(true),
        acciones:
          producto.estado === 'HABILITADO' ? (
            <Button
              variant="danger"
              disabled={baja.dandoDeBaja}
              onClick={() => void baja.darDeBaja()}
            >
              Dar de baja
            </Button>
          ) : undefined,
      }}
    />
  );
}

export function ProductoEditarPage({ categoria }: { categoria: CategoriaEdicion }) {
  const configuracion = CONFIGURACIONES_EDICION[categoria];
  const { id } = useParams();
  const productoId = idDeLaRuta(id);
  const producto = useApi(
    () =>
      productoId === null
        ? Promise.resolve({ datos: null, exito: false, error: configuracion.noEncontrado })
        : obtenerProducto(categoria, productoId),
    `producto-${categoria}-${id ?? ''}`,
  );
  const secciones = useApi(listarSeccionesHabilitadas, 'secciones-habilitadas');
  const habilitadas = (secciones.datos?.items ?? []).filter(
    (seccion) => seccion.estado === 'HABILITADO',
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { etiqueta: 'Productos y Carta', ruta: '/productos' },
          { etiqueta: configuracion.titulo },
        ]}
      />
      <PageHeader titulo={configuracion.titulo} />
      {producto.cargando || secciones.cargando ? (
        <Spinner etiqueta={configuracion.cargando} />
      ) : producto.datos ? (
        <EdicionCargada
          categoria={categoria}
          producto={producto.datos}
          secciones={habilitadas}
          errorDeCarga={secciones.error}
        />
      ) : (
        <Alert variant="danger">
          {mensajeDeCarga(producto.error ?? configuracion.noEncontrado, configuracion)}
        </Alert>
      )}
    </div>
  );
}
