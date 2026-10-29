# Propuesta: HU-M2-01 Crear un menú ejecutivo

Implementar el alta de un menú ejecutivo compuesto por productos habilitados, almacenado en una sección habilitada y con estado inicial `HABILITADO`. El equipo M2 podrá consultar los menús mediante un listado paginado para comprobar el resultado del alta.

## Alcance

- Entidad `MenuEjecutivo`, tabla de asociación con `Producto`, restricciones de precio y unicidad del nombre normalizado.
- `POST /api/v1/menus-ejecutivos` y listado paginado `GET /api/v1/menus-ejecutivos`.
- Validación de sección, existencia y elegibilidad de cada producto; el servidor no confía en los filtros del cliente.
- Formulario y listado de menús ejecutivos en la pantalla M2, con pruebas en ambas capas.

## Fuera de alcance

- Modificación y baja lógica (HU-M2-02 y HU-M2-03).
- Menú del día, promociones y cambios en otros módulos.
- Extender el contrato `/api/v1/carta` de M1. La asociación a sección queda persistida; la exposición en la carta pública se coordina como cambio aparte si se confirma que esta HU la exige.
- Creación o modificación de productos y secciones.

## Beneficio

El encargado podrá definir un precio fijo y agrupar productos disponibles sin duplicar el catálogo de M1 ni permitir referencias a productos que no deben pertenecer a un menú ejecutivo.

## Supuestos para aprobar

Ver `specs/menus-ejecutivos/spec.md`, sección «Supuestos para revisar». No iniciar la fase de aplicación hasta que el usuario revise esos supuestos y el contrato propuesto.

## Reversión

La revisión Alembic crea únicamente las tablas e índices de menús ejecutivos y su asociación. En una base temporal, `downgrade` debe eliminar solo esas estructuras y preservar productos/secciones. En un entorno con datos reales, respaldar o exportar los menús antes de ejecutar el downgrade, ya que se perderían sus registros.
