import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  Info,
  Pencil,
  Plus,
  Settings,
  Trash2,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useConfirm } from '../hooks/useConfirm';
import { usePaginacion } from '../hooks/usePaginacion';
import { useToast } from '../hooks/useToast';
import { formatearFecha, formatearHora, formatearMoneda, formatearNumero } from '../lib/format';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { Alert } from './ui/alert';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Breadcrumbs } from './ui/breadcrumbs';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ChartContainer } from './ui/chart-container';
import { Checkbox } from './ui/checkbox';
import { DataTable } from './ui/data-table';
import type { ColumnaTabla } from './ui/data-table';
import { DateRangePicker } from './ui/date-range-picker';
import { DescriptionList } from './ui/description-list';
import { Dialog } from './ui/dialog';
import { DropdownMenu } from './ui/dropdown-menu';
import { ErrorState } from './ui/error-state';
import { ExportButton } from './ui/export-button';
import { FilterBar } from './ui/filter-bar';
import { FormField } from './ui/form-field';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { List, ListContent, ListDescription, ListIcon, ListItem, ListTitle } from './ui/list';
import { Pagination } from './ui/pagination';
import { PaginationSummary } from './ui/pagination-summary';
import { Popover } from './ui/popover';
import { SearchInput } from './ui/search-input';
import { Select } from './ui/select';
import { Separator } from './ui/separator';
import { Sheet } from './ui/sheet';
import { Skeleton } from './ui/skeleton';
import { Spinner } from './ui/spinner';
import { StatCard } from './ui/stat-card';
import { StatusBadge } from './ui/status-badge';
import { Switch } from './ui/switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { TableToolbar } from './ui/table-toolbar';
import { Tabs } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Tooltip } from './ui/tooltip';

const PALETA = [
  {
    nombre: 'Brand / Primary',
    clase: 'bg-brand',
    texto: 'text-brand-foreground',
    hex: '#b45309',
  },
  {
    nombre: 'Secondary',
    clase: 'bg-secondary',
    texto: 'text-secondary-foreground',
    hex: '#475569',
  },
  { nombre: 'Success', clase: 'bg-success', texto: 'text-success-foreground', hex: '#047857' },
  { nombre: 'Danger', clase: 'bg-danger', texto: 'text-danger-foreground', hex: '#be123c' },
  { nombre: 'Warning', clase: 'bg-warning', texto: 'text-warning-foreground', hex: '#f59e0b' },
  { nombre: 'Info', clase: 'bg-info', texto: 'text-info-foreground', hex: '#0369a1' },
  { nombre: 'Light', clase: 'bg-light', texto: 'text-slate-900', hex: '#f8fafc' },
  { nombre: 'Dark', clase: 'bg-dark', texto: 'text-dark-foreground', hex: '#0f172a' },
] as const;

interface FilaComanda {
  id: string;
  numero: string;
  mesa: string;
  mozo: string;
  hora: string;
  estado: string;
  total: number;
}

const FILAS_COMANDAS: FilaComanda[] = [
  {
    id: '1',
    numero: '1842',
    mesa: 'Mesa 4',
    mozo: 'Lucía Fernández',
    hora: '21:15',
    estado: 'abierta',
    total: 18500,
  },
  {
    id: '2',
    numero: '1841',
    mesa: 'Mesa 2',
    mozo: 'Martín Pérez',
    hora: '21:02',
    estado: 'en_cocina',
    total: 12750,
  },
  {
    id: '3',
    numero: '1840',
    mesa: 'Mesa 7',
    mozo: 'Ana Gómez',
    hora: '20:48',
    estado: 'servida',
    total: 24300,
  },
  {
    id: '4',
    numero: '1839',
    mesa: 'Mesa 1',
    mozo: 'Lucía Fernández',
    hora: '20:31',
    estado: 'cerrada',
    total: 9800,
  },
  {
    id: '5',
    numero: '1838',
    mesa: 'Mesa 5',
    mozo: 'Martín Pérez',
    hora: '20:12',
    estado: 'pendiente_pago',
    total: 31200,
  },
  {
    id: '6',
    numero: '1837',
    mesa: 'Mesa 3',
    mozo: 'Ana Gómez',
    hora: '19:55',
    estado: 'cancelada',
    total: 0,
  },
];

const DATOS_REPORTE = [
  { dia: 'Lun', ventas: 42000 },
  { dia: 'Mar', ventas: 51000 },
  { dia: 'Mié', ventas: 38500 },
  { dia: 'Jue', ventas: 62000 },
  { dia: 'Vie', ventas: 84000 },
  { dia: 'Sáb', ventas: 96000 },
  { dia: 'Dom', ventas: 73000 },
];

interface SeccionProps {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}

function Seccion({ titulo, descripcion, children }: SeccionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>
      {children}
    </section>
  );
}

export function ComponentesPage() {
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [desde, setDesde] = useState('2026-10-01');
  const [hasta, setHasta] = useState('2026-10-24');
  const [disponible, setDisponible] = useState(true);
  const [promocionActiva, setPromocionActiva] = useState(true);
  const [tabActiva, setTabActiva] = useState('platos');

  const { mostrarToast } = useToast();
  const confirmar = useConfirm();
  const paginacionDemo = usePaginacion({ total: 128, limite: 16 });
  const maxVentas = Math.max(...DATOS_REPORTE.map((item) => item.ventas));

  const filasFiltradas = FILAS_COMANDAS.filter((fila) => {
    const texto = `${fila.numero} ${fila.mesa} ${fila.mozo}`.toLowerCase();
    const coincideBusqueda = texto.includes(busqueda.toLowerCase());
    const coincideEstado = estadoFiltro === 'todos' || fila.estado === estadoFiltro;
    return coincideBusqueda && coincideEstado;
  });

  const columnasComandas: ColumnaTabla<FilaComanda>[] = [
    {
      clave: 'numero',
      encabezado: 'Comanda',
      render: (fila) => <span className="font-medium text-slate-900">#{fila.numero}</span>,
    },
    { clave: 'mesa', encabezado: 'Mesa', render: (fila) => fila.mesa },
    {
      clave: 'mozo',
      encabezado: 'Mozo',
      render: (fila) => (
        <span className="flex items-center gap-2">
          <Avatar nombre={fila.mozo} />
          <span>{fila.mozo}</span>
        </span>
      ),
    },
    { clave: 'hora', encabezado: 'Hora', render: (fila) => fila.hora },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (fila) => <StatusBadge estado={fila.estado} />,
    },
    {
      clave: 'total',
      encabezado: 'Total',
      className: 'text-right',
      render: (fila) => formatearMoneda(fila.total),
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      className: 'text-right',
      render: (fila) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                etiqueta: 'Ver detalle',
                icono: Eye,
                onSelect: () =>
                  mostrarToast({
                    titulo: `Comanda #${fila.numero}`,
                    descripcion: 'Detalle de ejemplo de la comanda.',
                    variante: 'info',
                  }),
              },
              {
                etiqueta: 'Editar',
                icono: Pencil,
                onSelect: () =>
                  mostrarToast({
                    titulo: 'Edición de ejemplo',
                    descripcion: `Comanda #${fila.numero}`,
                    variante: 'info',
                  }),
              },
              {
                etiqueta: 'Eliminar',
                icono: Trash2,
                peligro: true,
                onSelect: () => {
                  void confirmar({
                    titulo: 'Eliminar comanda',
                    descripcion: `¿Querés eliminar la comanda #${fila.numero}? Esta acción no se puede deshacer.`,
                    variante: 'danger',
                    textoConfirmar: 'Eliminar',
                  }).then((confirmado) => {
                    if (confirmado) {
                      mostrarToast({
                        titulo: 'Comanda eliminada',
                        variante: 'success',
                      });
                    }
                  });
                },
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Guía de componentes"
        descripcion="Referencia visual de los bloques reutilizables disponibles para los seis módulos."
        acciones={
          <Button>
            <Plus className="h-4 w-4" />
            Acción principal
          </Button>
        }
      />

      <Seccion
        titulo="Botones"
        descripcion="Variantes, tamaños y estados. Usar la variante según la jerarquía de la acción."
      >
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Fantasma</Button>
              <Button variant="danger">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
              <Button disabled>Deshabilitado</Button>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeño</Button>
              <Button size="md">Mediano</Button>
              <Button size="lg">Grande</Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Formularios"
        descripcion="Controles base para los ABM de los módulos: texto, selección, fechas y estados."
      >
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <FormField
              id="demo-nombre"
              label="Nombre del plato"
              hint="Es el nombre que se muestra en la carta."
              required
            >
              <Input id="demo-nombre" placeholder="Milanesa napolitana" />
            </FormField>

            <FormField id="demo-categoria" label="Categoría">
              <Select id="demo-categoria" defaultValue="platos">
                <option value="platos">Platos</option>
                <option value="postres">Postres</option>
                <option value="bebidas">Bebidas</option>
              </Select>
            </FormField>

            <FormField id="demo-descripcion" label="Descripción" className="sm:col-span-2">
              <Textarea
                id="demo-descripcion"
                placeholder="Ingredientes, alérgenos y observaciones."
              />
            </FormField>

            <FormField
              id="demo-precio"
              label="Precio"
              error="El precio tiene que ser mayor a cero."
            >
              <Input id="demo-precio" type="number" defaultValue={-100} aria-invalid="true" />
            </FormField>

            <div className="space-y-1.5">
              <Label htmlFor="demo-busqueda">Búsqueda</Label>
              <SearchInput
                id="demo-busqueda"
                placeholder="Buscar comanda, mesa o mozo..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                onLimpiar={() => setBusqueda('')}
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Checkbox
                id="demo-disponible"
                checked={disponible}
                onChange={(event) => setDisponible(event.target.checked)}
              />
              <Label htmlFor="demo-disponible">Producto disponible en carta</Label>
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={promocionActiva}
                onCheckedChange={setPromocionActiva}
                aria-label="Activar promoción"
              />
              <span className="text-sm text-slate-600">
                Promoción {promocionActiva ? 'activa' : 'inactiva'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <DateRangePicker
                desde={desde}
                hasta={hasta}
                onCambiarDesde={setDesde}
                onCambiarHasta={setHasta}
                etiquetaDesde="Período desde"
                etiquetaHasta="Período hasta"
              />
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Feedback"
        descripcion="Mensajes inline, notificaciones, estados de carga y error."
      >
        <div className="space-y-3">
          <Alert variant="success" titulo="Cambios guardados">
            El plato se actualizó correctamente.
          </Alert>
          <Alert variant="warning" titulo="Revisá los datos">
            Hay campos obligatorios sin completar.
          </Alert>
          <Alert variant="danger" titulo="No se pudo guardar">
            El servidor rechazó la operación. Intentá nuevamente.
          </Alert>
          <Alert variant="info" titulo="Información">
            Los cambios se van a reflejar en la próxima actualización de la carta.
          </Alert>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Button
              onClick={() =>
                mostrarToast({
                  titulo: 'Comanda creada',
                  descripcion: 'Mesa 4 · 2 platos · 2 bebidas',
                  variante: 'success',
                })
              }
            >
              <Bell className="h-4 w-4" />
              Mostrar toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                mostrarToast({
                  titulo: 'No se pudo conectar',
                  descripcion: 'Revisá el estado del backend.',
                  variante: 'danger',
                })
              }
            >
              Toast de error
            </Button>
            <Spinner etiqueta="Guardando..." />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <ErrorState
              descripcion="No se pudo cargar el listado de comandas. Verificá la conexión e intentá de nuevo."
              onReintentar={() => mostrarToast({ titulo: 'Reintentando...', variante: 'info' })}
            />
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Etiquetas de estado"
        descripcion="Para indicar el estado de una mesa, una comanda o un pago sin depender del color."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Activo</Badge>
          <Badge variant="danger">Cancelado</Badge>
          <Badge variant="warning">Pendiente</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </Seccion>

      <Seccion
        titulo="Paleta de colores"
        descripcion="Tokens semánticos definidos en src/index.css. Se usan como bg-<color>, text-<color>, border-<color>, etc."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PALETA.map((color) => (
            <div
              key={color.nombre}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className={`flex h-16 items-end p-3 ${color.clase} ${color.texto}`}>
                <span className="text-sm font-semibold">{color.nombre}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-slate-500">{color.hex}</span>
                <code className="text-xs text-slate-600">{color.clase}</code>
              </div>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="Tarjetas"
        descripcion="Contenedores para agrupar información, métricas o accesos rápidos."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tarjeta simple</CardTitle>
              <CardDescription>Título y descripción con contenido libre.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Ideal para mostrar un resumen breve de un módulo o una métrica.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Con acción</CardTitle>
                <Badge variant="success">Activa</Badge>
              </div>
              <CardDescription>Encabezado con estado y pie de página.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">128</p>
              <p className="text-xs text-slate-500">comandas del turno</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Ver detalle
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="pt-2">Acceso a módulo</CardTitle>
              <CardDescription>Tarjeta de navegación con icono.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" size="sm" className="px-0">
                Ir a Productos y Carta
              </Button>
            </CardContent>
          </Card>
        </div>
      </Seccion>

      <Seccion
        titulo="Listas"
        descripcion="Filas con icono, título y descripción. Sirven para mesas, comandas, reservas o movimientos."
      >
        <Card>
          <CardHeader>
            <CardTitle>Elementos del salón</CardTitle>
            <CardDescription>Ejemplo de lista con iconos y estados.</CardDescription>
          </CardHeader>
          <CardContent>
            <List>
              <ListItem>
                <ListIcon>
                  <Users className="h-4 w-4" aria-hidden="true" />
                </ListIcon>
                <ListContent>
                  <ListTitle>Mesa 4 · Sector ventana</ListTitle>
                  <ListDescription>4 comensales · Mozo: Lucía</ListDescription>
                </ListContent>
                <Badge variant="success">Libre</Badge>
              </ListItem>
              <ListItem>
                <ListIcon>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                </ListIcon>
                <ListContent>
                  <ListTitle>Comanda #1842</ListTitle>
                  <ListDescription>2 platos · 2 bebidas · En cocina</ListDescription>
                </ListContent>
                <Badge variant="warning">Pendiente</Badge>
              </ListItem>
              <ListItem>
                <ListIcon>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                </ListIcon>
                <ListContent>
                  <ListTitle>Reserva de Ana Pérez</ListTitle>
                  <ListDescription>Hoy 21:00 · 6 comensales</ListDescription>
                </ListContent>
                <Badge variant="neutral">Confirmada</Badge>
              </ListItem>
              <ListItem>
                <ListIcon>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                </ListIcon>
                <ListContent>
                  <ListTitle>Pago con tarjeta</ListTitle>
                  <ListDescription>Factura B-0001-00001234</ListDescription>
                </ListContent>
                <Badge variant="success">Cobrado</Badge>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Tablas"
        descripcion="Grilla de datos para listados paginados. Es la base de mesas, comandas, reservas y pagos."
      >
        <Card>
          <CardHeader>
            <CardTitle>Estado de mesas</CardTitle>
            <CardDescription>
              Ejemplo de tabla con encabezado, badges y total al pie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Actualizado hace un instante.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Mozo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Mesa 1</TableCell>
                  <TableCell>Ventana</TableCell>
                  <TableCell>4</TableCell>
                  <TableCell>Lucía</TableCell>
                  <TableCell>
                    <Badge variant="success">Libre</Badge>
                  </TableCell>
                  <TableCell className="text-right">$0</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Mesa 2</TableCell>
                  <TableCell>Salón</TableCell>
                  <TableCell>2</TableCell>
                  <TableCell>Martín</TableCell>
                  <TableCell>
                    <Badge variant="warning">Ocupada</Badge>
                  </TableCell>
                  <TableCell className="text-right">$18.500</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Mesa 3</TableCell>
                  <TableCell>Salón</TableCell>
                  <TableCell>6</TableCell>
                  <TableCell>Ana</TableCell>
                  <TableCell>
                    <Badge variant="info">Reservada</Badge>
                  </TableCell>
                  <TableCell className="text-right">$0</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Mesa 4</TableCell>
                  <TableCell>Terraza</TableCell>
                  <TableCell>4</TableCell>
                  <TableCell>Sin asignar</TableCell>
                  <TableCell>
                    <Badge variant="danger">Mantenimiento</Badge>
                  </TableCell>
                  <TableCell className="text-right">$0</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Total del turno</TableCell>
                  <TableCell className="text-right">$18.500</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Tabla de datos"
        descripcion="DataTable con búsqueda, filtros, acciones por fila y exportación a CSV."
      >
        <Card>
          <CardContent className="pt-6">
            <TableToolbar
              acciones={<ExportButton filas={filasFiltradas} nombreArchivo="comandas" />}
            >
              <SearchInput
                placeholder="Buscar por comanda, mesa o mozo..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                onLimpiar={() => setBusqueda('')}
              />
              <FilterBar className="border-0 p-0">
                <Select
                  aria-label="Filtrar por estado"
                  value={estadoFiltro}
                  onChange={(event) => setEstadoFiltro(event.target.value)}
                  className="sm:w-48"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="abierta">Abierta</option>
                  <option value="en_cocina">En cocina</option>
                  <option value="servida">Servida</option>
                  <option value="cerrada">Cerrada</option>
                  <option value="pendiente_pago">Pendiente de pago</option>
                  <option value="cancelada">Cancelada</option>
                </Select>
              </FilterBar>
            </TableToolbar>

            <DataTable
              columnas={columnasComandas}
              filas={filasFiltradas}
              obtenerClave={(fila) => fila.id}
              vacio={
                <EmptyState
                  icono={ClipboardList}
                  titulo="No hay comandas"
                  descripcion="Probá con otro estado o limpiá la búsqueda."
                />
              }
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PaginationSummary
                desde={filasFiltradas.length > 0 ? 1 : 0}
                hasta={filasFiltradas.length}
                total={FILAS_COMANDAS.length}
                etiqueta="comandas"
              />
              <ExportButton filas={filasFiltradas} nombreArchivo="comandas" />
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Paginador"
        descripcion="Navegación para listados paginados. Acompaña a la tabla y respeta el límite de 50 registros por página (D-27)."
      >
        <Card>
          <CardHeader>
            <CardTitle>Comandas del turno</CardTitle>
            <CardDescription>128 registros · 16 por página</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PaginationSummary
              desde={(paginacionDemo.pagina - 1) * paginacionDemo.limite + 1}
              hasta={Math.min(paginacionDemo.pagina * paginacionDemo.limite, 128)}
              total={128}
              etiqueta="comandas"
            />
            <Pagination
              pagina={paginacionDemo.pagina}
              totalPaginas={paginacionDemo.totalPaginas}
              onCambiarPagina={paginacionDemo.irAPagina}
            />
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Separadores"
        descripcion="Divisores horizontales y verticales para agrupar contenido."
      >
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-slate-600">Contenido antes del separador.</p>
            <Separator />
            <p className="text-sm text-slate-600">Contenido después del separador.</p>
            <div className="flex h-10 items-center gap-3">
              <span className="text-sm text-slate-600">Sección A</span>
              <Separator orientation="vertical" />
              <span className="text-sm text-slate-600">Sección B</span>
              <Separator orientation="vertical" />
              <span className="text-sm text-slate-600">Sección C</span>
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Estados vacíos"
        descripcion="Para listados sin datos o módulos todavía no implementados."
      >
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icono={BookOpen}
              titulo="Todavía no hay promociones"
              descripcion="Cuando se cargue la primera promoción, va a aparecer en este listado."
              accion={
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Nueva promoción
                </Button>
              }
            />
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Panel lateral"
        descripcion="Drawer reutilizable para menú móvil, filtros o formularios rápidos."
      >
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Button variant="outline" onClick={() => setSheetAbierto(true)}>
              <Settings className="h-4 w-4" />
              Abrir panel lateral
            </Button>
            <span className="text-sm text-slate-500">
              Se cierra con el botón, haciendo clic fuera o con Escape.
            </span>
          </CardContent>
        </Card>

        <Sheet
          open={sheetAbierto}
          onOpenChange={setSheetAbierto}
          title="Panel de ejemplo"
          side="right"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Acá puede ir un formulario, un detalle de comanda o filtros de un listado.
            </p>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Info className="h-4 w-4" aria-hidden="true" />
              El componente ya maneja foco, Escape y bloqueo del scroll.
            </div>
            <Button size="sm" onClick={() => setSheetAbierto(false)}>
              <CheckCircle2 className="h-4 w-4" />
              Entendido
            </Button>
          </div>
        </Sheet>
      </Seccion>

      <Seccion
        titulo="Modales"
        descripcion="Ventanas de confirmación para acciones destructivas o cambios que necesitan confirmación."
      >
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Button variant="danger" onClick={() => setModalAbierto(true)}>
              <Trash2 className="h-4 w-4" />
              Eliminar mesa
            </Button>
            <span className="text-sm text-slate-500">
              Se cierra con Escape, con la cruz, con Cancelar o haciendo clic fuera.
            </span>
          </CardContent>
        </Card>

        <Dialog
          open={modalAbierto}
          onOpenChange={setModalAbierto}
          title="Eliminar mesa"
          description="Esta acción no se puede deshacer."
          footer={
            <>
              <Button variant="outline" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => setModalAbierto(false)}>
                Eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            ¿Confirmás que querés eliminar la mesa 4? Las comandas abiertas se tienen que cerrar
            antes de eliminarla.
          </p>
        </Dialog>
      </Seccion>

      <Seccion
        titulo="Navegación"
        descripcion="Migas de pan y pestañas para organizar subsecciones dentro de un módulo."
      >
        <Card>
          <CardContent className="space-y-5 pt-6">
            <Breadcrumbs
              items={[
                { etiqueta: 'Inicio', ruta: '/' },
                { etiqueta: 'Salón y Mozos', ruta: '/salon' },
                { etiqueta: 'Mesas' },
              ]}
            />
            <Separator />
            <Tabs
              valor={tabActiva}
              onCambiar={setTabActiva}
              items={[
                {
                  id: 'platos',
                  etiqueta: 'Platos',
                  contenido: (
                    <p className="text-sm text-slate-600">Contenido de la pestaña Platos.</p>
                  ),
                },
                {
                  id: 'postres',
                  etiqueta: 'Postres',
                  contenido: (
                    <p className="text-sm text-slate-600">Contenido de la pestaña Postres.</p>
                  ),
                },
                {
                  id: 'bebidas',
                  etiqueta: 'Bebidas',
                  contenido: (
                    <p className="text-sm text-slate-600">Contenido de la pestaña Bebidas.</p>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Resúmenes y estados"
        descripcion="Tarjetas de métricas, fichas de detalle, avatares y badges de estado."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            titulo="Comandas del día"
            valor="128"
            descripcion="+12% respecto de ayer"
            icono={TrendingUp}
          />
          <StatCard
            titulo="Recaudación"
            valor={formatearMoneda(845000)}
            descripcion="Turno noche"
            icono={Wallet}
          />
          <StatCard
            titulo="Mesas ocupadas"
            valor="9 / 14"
            descripcion="64% de ocupación"
            icono={Users}
          />
        </div>

        <Card>
          <CardContent className="space-y-5 pt-6">
            <DescriptionList
              items={[
                { termino: 'Cliente', detalle: 'Ana Pérez' },
                { termino: 'Teléfono', detalle: '+54 9 280 412-3456' },
                { termino: 'Reserva', detalle: 'Hoy 21:00 · 6 comensales' },
                { termino: 'Mesa', detalle: 'Mesa 7 · Sector terraza' },
              ]}
            />
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge estado="abierta" />
              <StatusBadge estado="en_cocina" />
              <StatusBadge estado="servida" />
              <StatusBadge estado="cancelada" />
              <StatusBadge estado="pendiente_pago" />
              <StatusBadge estado="estado_desconocido" />
            </div>
            <div className="flex items-center gap-3">
              <Avatar nombre="Lucía Fernández" />
              <Avatar nombre="Martín Pérez" />
              <Avatar nombre="Ana Gómez" />
              <span className="text-sm text-slate-500">Mozos del turno</span>
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion titulo="Overlays" descripcion="Tooltips, popovers y confirmaciones reutilizables.">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Tooltip contenido="Actualizar estado">
              <Button variant="outline" size="sm" aria-label="Actualizar estado">
                <Settings className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Popover trigger={<Button variant="outline">Filtros avanzados</Button>}>
              <p className="font-medium text-slate-900">Filtros</p>
              <p className="mt-1 text-slate-500">
                Acá puede ir un formulario breve de filtros o acciones rápidas.
              </p>
            </Popover>

            <Button
              variant="danger"
              onClick={() => {
                void confirmar({
                  titulo: 'Eliminar promoción',
                  descripcion: 'La promoción va a dejar de mostrarse en la carta.',
                  variante: 'danger',
                  textoConfirmar: 'Eliminar',
                }).then((confirmado) => {
                  if (confirmado) {
                    mostrarToast({ titulo: 'Promoción eliminada', variante: 'success' });
                  }
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar con confirmación
            </Button>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Reportes"
        descripcion="Contenedores de gráficos y exportación para los reportes por módulo."
      >
        <ChartContainer
          titulo="Ventas de la semana"
          descripcion="Últimos 7 días"
          acciones={<ExportButton filas={DATOS_REPORTE} nombreArchivo="ventas-semana" />}
        >
          <div className="flex h-48 items-end gap-2">
            {DATOS_REPORTE.map((item) => (
              <div key={item.dia} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-amber-600/80"
                  style={{ height: `${Math.round((item.ventas / maxVentas) * 100)}%` }}
                  title={`${item.dia}: ${formatearMoneda(item.ventas)}`}
                />
                <span className="text-xs text-slate-500">{item.dia}</span>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer
          titulo="Reservas por turno"
          descripcion="Sin datos para el período seleccionado"
          vacio
        />
      </Seccion>

      <Seccion
        titulo="Formato de datos"
        descripcion="Helpers para mostrar moneda, fechas, horas y números de forma consistente."
      >
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Moneda</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatearMoneda(18500)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatearFecha('2026-10-24')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hora</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatearHora('2026-10-24T21:15:00')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Número</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatearNumero(12500)}</p>
            </div>
          </CardContent>
        </Card>
      </Seccion>

      <Seccion
        titulo="Páginas de error"
        descripcion="Ruta 404 reutilizable y límite de errores por módulo."
      >
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Link
              to="/ruta-inexistente"
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              Ver página 404
            </Link>
            <span className="text-sm text-slate-500">
              El ErrorBoundary envuelve el contenido de cada módulo.
            </span>
          </CardContent>
        </Card>
      </Seccion>
    </div>
  );
}
