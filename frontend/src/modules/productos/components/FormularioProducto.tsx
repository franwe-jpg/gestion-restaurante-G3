import { Link } from 'react-router-dom';

import { Alert } from '../../../shared/components/ui/alert';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Switch } from '../../../shared/components/ui/switch';
import type { ConfiguracionAlta } from '../categorias';
import type { Estado } from '../types';

import { ListaDeTextos } from './ListaDeTextos';
import { SelectorImagen } from './SelectorImagen';
import type { OpcionSeccion } from './seccionesParaEditar';
import type { useFormularioProducto } from './useFormularioProducto';
import {
  DESCRIPCION_MAXIMA,
  ETIQUETA_MAXIMA,
  ETIQUETAS_TOPE,
  INGREDIENTE_MAXIMO,
  INGREDIENTES_TOPE,
} from './validarProducto';

type Formulario = ReturnType<typeof useFormularioProducto>;

/** El diálogo envía el formulario desde su pie con `<button form={ID_FORMULARIO_PRODUCTO}>`. */
export const ID_FORMULARIO_PRODUCTO = 'formulario-producto';

/** Lo que solo existe al editar: estado editable e imagen vigente. */
export interface EdicionFormulario {
  estado: Estado;
  onCambiarEstado: (estado: Estado) => void;
  imagenActual: string | null;
  onQuitarImagenActual: () => void;
}

function CampoEstado({ edicion }: { edicion?: EdicionFormulario }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">Estado</span>
      {edicion ? (
        <div className="flex min-h-9 items-center gap-2">
          <Switch
            id="producto-estado"
            aria-label="Habilitado"
            checked={edicion.estado === 'HABILITADO'}
            onCheckedChange={(activo) =>
              edicion.onCambiarEstado(activo ? 'HABILITADO' : 'DESHABILITADO')
            }
          />
          <span className="text-sm font-medium text-slate-900">
            {edicion.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </div>
      ) : (
        <p className="flex min-h-9 items-center text-sm font-medium text-slate-900">Habilitado</p>
      )}
    </div>
  );
}

interface CamposPrincipalesProps {
  f: Formulario;
  secciones: OpcionSeccion[];
  edicion?: EdicionFormulario;
}

function CamposPrincipales({ f, secciones, edicion }: CamposPrincipalesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="producto-nombre" label="Nombre" required error={f.errores.nombre}>
        <Input
          id="producto-nombre"
          value={f.nombre}
          onChange={(evento) => f.setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="producto-seccion" label="Sección" required error={f.errores.seccionId}>
        <Select
          id="producto-seccion"
          value={f.seccionId}
          onChange={(evento) => f.setSeccionId(evento.target.value)}
        >
          <option value="">Seleccione una sección</option>
          {secciones.map((seccion) => (
            <option key={seccion.id} value={seccion.id}>
              {seccion.nombre}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="producto-precio" label="Precio" required error={f.errores.precio}>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm text-slate-600">$</span>
          <Input
            id="producto-precio"
            inputMode="decimal"
            placeholder="12.500,00"
            className="pl-7"
            value={f.precio}
            onChange={(evento) => f.setPrecio(evento.target.value)}
          />
        </div>
      </FormField>
      <CampoEstado edicion={edicion} />
    </div>
  );
}

function CamposDeTexto({
  f,
  ingredientesObligatorios,
}: {
  f: Formulario;
  ingredientesObligatorios: boolean;
}) {
  return (
    <>
      <ListaDeTextos
        id="producto-ingredientes"
        etiqueta="Ingredientes"
        singular="ingrediente"
        plural="ingredientes"
        valores={f.ingredientes}
        onCambiar={f.setIngredientes}
        tope={INGREDIENTES_TOPE}
        maximoPorTexto={INGREDIENTE_MAXIMO}
        placeholder="Escriba un ingrediente y presione Enter"
        required={ingredientesObligatorios}
        error={f.errores.ingredientes}
      />
      <FormField id="producto-descripcion" label="Descripción" error={f.errores.descripcion}>
        <Textarea
          id="producto-descripcion"
          rows={3}
          value={f.descripcion}
          onChange={(evento) => f.setDescripcion(evento.target.value)}
        />
        <p className="text-right text-xs text-slate-500">
          {f.descripcion.length} / {DESCRIPCION_MAXIMA}
        </p>
      </FormField>
      <ListaDeTextos
        id="producto-etiquetas"
        etiqueta="Etiquetas"
        singular="etiqueta"
        plural="etiquetas"
        valores={f.etiquetas}
        onCambiar={f.setEtiquetas}
        tope={ETIQUETAS_TOPE}
        maximoPorTexto={ETIQUETA_MAXIMA}
        placeholder="Por ejemplo: Vegano, Sin TACC"
      />
    </>
  );
}

interface AvisoSinSeccionesProps {
  mensaje: string;
  /** Lleva a la pestaña «Secciones» de la misma página (cierra el diálogo). */
  onIrASecciones?: () => void;
}

function AvisoSinSecciones({ mensaje, onIrASecciones }: AvisoSinSeccionesProps) {
  return (
    <Alert variant="warning" titulo="Primero hay que crear una sección">
      {mensaje}{' '}
      <Link
        to="/productos?pestania=secciones"
        className="font-medium underline"
        onClick={onIrASecciones}
      >
        Ir a Secciones
      </Link>
    </Alert>
  );
}

export interface FormularioProductoProps {
  f: Formulario;
  configuracion: Pick<ConfiguracionAlta, 'avisoSinSecciones' | 'ingredientesObligatorios'>;
  secciones: OpcionSeccion[];
  errorDeCarga: string | null;
  edicion?: EdicionFormulario;
  onIrASecciones?: () => void;
}

/** Campos del producto; los botones de guardar y cancelar los pone el diálogo que lo contiene. */
export function FormularioProducto({
  f,
  configuracion,
  secciones,
  errorDeCarga,
  edicion,
  onIrASecciones,
}: FormularioProductoProps) {
  return (
    <form
      id={ID_FORMULARIO_PRODUCTO}
      noValidate
      className="space-y-5"
      onSubmit={(evento) => {
        evento.preventDefault();
        void f.enviar();
      }}
    >
      {errorDeCarga && <Alert variant="danger">{errorDeCarga}</Alert>}
      {!errorDeCarga && secciones.length === 0 && (
        <AvisoSinSecciones
          mensaje={configuracion.avisoSinSecciones}
          onIrASecciones={onIrASecciones}
        />
      )}
      {f.errores.general && <Alert variant="danger">{f.errores.general}</Alert>}
      <CamposPrincipales f={f} secciones={secciones} edicion={edicion} />
      <CamposDeTexto f={f} ingredientesObligatorios={configuracion.ingredientesObligatorios} />
      <div className="space-y-3">
        <span className="text-sm font-medium text-slate-700">Imagen</span>
        <SelectorImagen
          onCambiar={f.setImagen}
          imagenActual={edicion?.imagenActual}
          onQuitarActual={edicion?.onQuitarImagenActual}
        />
      </div>
    </form>
  );
}
