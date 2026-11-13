import type { ReactNode } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { Spinner } from '../../../shared/components/ui/spinner';
import { useApi } from '../../../shared/hooks/useApi';
import { listarSeccionesHabilitadas, obtenerProducto, urlDeImagen } from '../api';
import { CONFIGURACIONES, CONFIGURACIONES_EDICION } from '../categorias';
import type { CategoriaAlta, CategoriaEdicion, ConfiguracionEdicion } from '../categorias';
import type { ProductoSalida } from '../types';

import { FormularioProducto, ID_FORMULARIO_PRODUCTO } from './FormularioProducto';
import { seccionesParaEditar } from './seccionesParaEditar';
import type { OpcionSeccion } from './seccionesParaEditar';
import { useBajaProducto } from './useBajaProducto';
import { useEdicionProducto } from './useEdicionProducto';
import { useFormularioProducto } from './useFormularioProducto';

export interface ProductoFormDialogProps {
  categoria: CategoriaAlta;
  /** Con `productoId` el diálogo edita ese producto; sin él, crea uno de la categoría. */
  productoId?: number;
  onGuardado: () => void;
  onDadoDeBaja: () => void;
  onIrASecciones?: () => void;
  onOpenChange: (abierto: boolean) => void;
}

interface MarcoProps {
  titulo: string;
  pie: ReactNode;
  children: ReactNode;
  onOpenChange: (abierto: boolean) => void;
}

/** El formulario es largo: el cuerpo se desplaza y el pie con los botones queda a la vista. */
function Marco({ titulo, pie, children, onOpenChange }: MarcoProps) {
  return (
    <Dialog open size="lg" title={titulo} onOpenChange={onOpenChange} footer={pie}>
      <div className="-mx-1 max-h-[65vh] overflow-y-auto px-1">{children}</div>
    </Dialog>
  );
}

interface PieProps {
  guardar: string;
  deshabilitado: boolean;
  acciones?: ReactNode;
  onCancelar: () => void;
}

function Pie({ guardar, deshabilitado, acciones, onCancelar }: PieProps) {
  return (
    <>
      {acciones && <div className="sm:mr-auto">{acciones}</div>}
      <Button variant="brand-outline" onClick={onCancelar}>
        Cancelar
      </Button>
      <Button type="submit" form={ID_FORMULARIO_PRODUCTO} disabled={deshabilitado}>
        {guardar}
      </Button>
    </>
  );
}

/** Solo las secciones habilitadas se ofrecen en el selector (CA 9). */
function useSeccionesHabilitadas() {
  const consulta = useApi(listarSeccionesHabilitadas, 'secciones-habilitadas');
  const habilitadas = (consulta.datos?.items ?? []).filter(
    (seccion) => seccion.estado === 'HABILITADO',
  );
  return { ...consulta, habilitadas };
}

type DialogoAltaProps = Omit<ProductoFormDialogProps, 'productoId' | 'onDadoDeBaja'>;

function DialogoAlta({ categoria, onGuardado, onIrASecciones, onOpenChange }: DialogoAltaProps) {
  const configuracion = CONFIGURACIONES[categoria];
  const secciones = useSeccionesHabilitadas();
  const f = useFormularioProducto({ categoria, onCreado: onGuardado });
  const sinSecciones = secciones.habilitadas.length === 0;

  return (
    <Marco
      titulo={configuracion.titulo}
      onOpenChange={onOpenChange}
      pie={
        <Pie
          guardar={configuracion.botonGuardar}
          deshabilitado={secciones.cargando || sinSecciones || f.enviando}
          onCancelar={() => onOpenChange(false)}
        />
      }
    >
      {secciones.cargando ? (
        <Spinner etiqueta="Cargando secciones..." />
      ) : (
        <FormularioProducto
          f={f}
          configuracion={configuracion}
          secciones={secciones.habilitadas}
          errorDeCarga={secciones.error}
          onIrASecciones={onIrASecciones}
        />
      )}
    </Marco>
  );
}

interface EdicionCargadaProps extends Omit<ProductoFormDialogProps, 'productoId' | 'categoria'> {
  categoria: CategoriaEdicion;
  producto: ProductoSalida;
  secciones: OpcionSeccion[];
  errorDeCarga: string | null;
}

function BotonBaja({
  deshabilitado,
  onDarDeBaja,
}: {
  deshabilitado: boolean;
  onDarDeBaja: () => void;
}) {
  return (
    <Button variant="danger" disabled={deshabilitado} onClick={onDarDeBaja}>
      Dar de baja
    </Button>
  );
}

function EdicionCargada({ categoria, producto, secciones, ...props }: EdicionCargadaProps) {
  const { onGuardado, onDadoDeBaja, onIrASecciones, onOpenChange } = props;
  const f = useEdicionProducto({ categoria, producto, onGuardado });
  const baja = useBajaProducto({ categoria, producto, onDadoDeBaja });
  const opciones = seccionesParaEditar(secciones, producto.seccion);
  const habilitado = producto.estado === 'HABILITADO';

  return (
    <Marco
      titulo={CONFIGURACIONES_EDICION[categoria].titulo}
      onOpenChange={onOpenChange}
      pie={
        <Pie
          guardar={CONFIGURACIONES_EDICION[categoria].botonGuardar}
          deshabilitado={opciones.length === 0 || f.enviando}
          onCancelar={() => onOpenChange(false)}
          acciones={
            habilitado && (
              <BotonBaja
                deshabilitado={baja.dandoDeBaja}
                onDarDeBaja={() => void baja.darDeBaja()}
              />
            )
          }
        />
      }
    >
      <FormularioProducto
        f={f}
        configuracion={CONFIGURACIONES[categoria]}
        secciones={opciones}
        errorDeCarga={props.errorDeCarga}
        onIrASecciones={onIrASecciones}
        edicion={{
          estado: f.estado,
          onCambiarEstado: f.setEstado,
          imagenActual: f.quitarImagen ? null : urlDeImagen(producto.imagen_url),
          onQuitarImagenActual: () => f.setQuitarImagen(true),
        }}
      />
    </Marco>
  );
}

function mensajeDeCarga(error: string, configuracion: ConfiguracionEdicion): string {
  return /no existe/i.test(error) ? configuracion.noEncontrado : error;
}

type DialogoEdicionProps = Omit<ProductoFormDialogProps, 'productoId'> & { productoId: number };

/** Pide el producto completo: la fila del listado no trae ingredientes, descripción ni imagen. */
function DialogoEdicion({ productoId, ...props }: DialogoEdicionProps) {
  const configuracion = CONFIGURACIONES_EDICION[props.categoria];
  const producto = useApi(
    () => obtenerProducto(props.categoria, productoId),
    `producto-${props.categoria}-${productoId}`,
  );
  const secciones = useSeccionesHabilitadas();

  if (producto.datos && !secciones.cargando) {
    return (
      <EdicionCargada
        {...props}
        producto={producto.datos}
        secciones={secciones.habilitadas}
        errorDeCarga={secciones.error}
      />
    );
  }
  const cargando = producto.cargando || secciones.cargando;
  const error = producto.error ?? configuracion.noEncontrado;
  return (
    <Marco
      titulo={configuracion.titulo}
      onOpenChange={props.onOpenChange}
      pie={
        <Pie
          guardar={configuracion.botonGuardar}
          deshabilitado
          onCancelar={() => props.onOpenChange(false)}
        />
      }
    >
      {cargando ? (
        <Spinner etiqueta={configuracion.cargando} />
      ) : (
        <Alert variant="danger">{mensajeDeCarga(error, configuracion)}</Alert>
      )}
    </Marco>
  );
}

/** Se monta solo mientras está abierto: cada apertura parte de campos vacíos o del producto. */
export function ProductoFormDialog({ productoId, ...props }: ProductoFormDialogProps) {
  if (productoId === undefined) return <DialogoAlta {...props} />;
  return <DialogoEdicion {...props} productoId={productoId} />;
}
