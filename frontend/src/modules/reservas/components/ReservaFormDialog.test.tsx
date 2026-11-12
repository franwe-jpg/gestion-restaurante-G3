import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import type { Pagina, RespuestaApi } from '../../../shared/types';
import { buscarClientes, crearReserva, listarMesasDisponibles, modificarReserva } from '../api';
import type { ClienteEncontrado, MesaDisponible, Reserva } from '../types';

import { ReservaFormDialog } from './ReservaFormDialog';

vi.mock('../api');

const CREADA: Reserva = {
  id: 1,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-03',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

/** Fila `ACTIVA` que se abre en el panel de edición. */
const EXISTENTE: Reserva = { ...CREADA, id: 12 };

const SALON = { id: 1, nombre: 'Salón' };
const MESA_5: MesaDisponible = { id: 5, numero: 5, capacidad: 4, sector: SALON };
const MESA_6: MesaDisponible = { id: 6, numero: 6, capacidad: 4, sector: SALON };
const MESA_12: MesaDisponible = {
  id: 12,
  numero: 1,
  capacidad: 2,
  sector: { id: 2, nombre: 'Terraza' },
};

const ANA: ClienteEncontrado = { id: 7, nombre: 'Ana Pérez', telefono: '+54 280 1234567' };
const TEXTO_ANA = 'Ana Pérez · +54 280 1234567';

function conClientes(items: ClienteEncontrado[]): RespuestaApi<Pagina<ClienteEncontrado>> {
  return { datos: { items, total: items.length, limit: 10, offset: 0 }, exito: true };
}

function conMesas(mesas: MesaDisponible[]): RespuestaApi<MesaDisponible[]> {
  return { datos: mesas, exito: true };
}

const mostrarToast = vi.fn();

function abrir(reserva?: Reserva) {
  const onOpenChange = vi.fn();
  const onGuardado = vi.fn();
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ReservaFormDialog reserva={reserva} onOpenChange={onOpenChange} onGuardado={onGuardado} />
    </ToastContext.Provider>,
  );
  return { onOpenChange, onGuardado };
}

type Campos = Partial<Record<'fecha' | 'hora' | 'cantidad', string>>;

const ETIQUETAS = {
  cliente: /Cliente/,
  fecha: /Fecha/,
  hora: /Hora/,
  cantidad: /Cantidad de personas/,
  mesa: /Mesa/,
} as const;

function escribir(valores: Campos) {
  for (const [campo, valor] of Object.entries(valores)) {
    const etiqueta = ETIQUETAS[campo as keyof typeof ETIQUETAS];
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  }
}

/** Espera a que la lista simulada llegue: la primera opción «Seleccione una mesa» ya está. */
async function esperarLista() {
  await screen.findByRole('option', { name: 'Seleccione una mesa' });
}

/** Elige la mesa con ese `id` en el selector, cuando la lista simulada ya la ofrece. */
async function elegirMesa(id: string) {
  const selector = screen.getByLabelText(ETIQUETAS.mesa);
  await waitFor(() => expect(selector.querySelector(`option[value="${id}"]`)).not.toBeNull());
  fireEvent.change(selector, { target: { value: id } });
}

/** Busca «Ana» y elige a «Ana Pérez» de la lista simulada (cliente 7). */
async function elegirCliente() {
  fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Ana' } });
  fireEvent.click(await screen.findByRole('button', { name: TEXTO_ANA }));
}

/** Pulsa «Cliente nuevo» y escribe Nombre y Teléfono. */
function cargarClienteNuevo(nombre: string, telefono: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Cliente nuevo' }));
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: telefono } });
}

interface OpcionesCompletar {
  mesa?: string;
  /** `'nuevo'` carga «Luis Gómez»; `'ninguno'` deja Cliente sin elegir. */
  cliente?: 'existente' | 'nuevo' | 'ninguno';
}

/** Completa el alta; `mesa: ''` deja la mesa sin elegir (el selector puede no estar listo). */
async function completar({
  mesa = '5',
  cliente = 'existente',
  ...campos
}: Campos & OpcionesCompletar = {}) {
  if (cliente === 'existente') await elegirCliente();
  if (cliente === 'nuevo') cargarClienteNuevo('Luis Gómez', '280-4556677');
  escribir({ fecha: '2026-11-03', hora: '21:30', cantidad: '4', ...campos });
  if (mesa !== '') await elegirMesa(mesa);
}

/** Deja que terminen las respuestas simuladas pendientes antes de seguir. */
async function asentar() {
  await act(async () => undefined);
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));
}

type MetodoDeCierre = 'Cancelar' | 'X' | 'Escape' | 'Fondo';

/** Cierra el modal por una de las cuatro vías equivalentes (Decisión 21). */
function cerrarCon(metodo: MetodoDeCierre) {
  if (metodo === 'Cancelar') {
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    return;
  }
  if (metodo === 'X') {
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    return;
  }
  if (metodo === 'Escape') {
    fireEvent.keyDown(window, { key: 'Escape' });
    return;
  }
  const fondo = document.querySelector('[aria-hidden="true"]');
  if (!(fondo instanceof HTMLElement)) throw new Error('No se encontró el fondo del modal');
  fireEvent.click(fondo);
}

beforeEach(() => {
  // Solo el reloj: los temporizadores reales siguen sirviendo a waitFor y findBy.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 12, 0));
  vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([MESA_5, MESA_12]));
  vi.mocked(buscarClientes).mockResolvedValue(conClientes([ANA]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('ReservaFormDialog: modal de alta', () => {
  it('se titula «Nueva reserva», trae los campos, y no tiene un botón «Cerrar formulario» aparte', () => {
    abrir();

    expect(screen.getByRole('dialog', { name: 'Nueva reserva' })).toBeInTheDocument();
    for (const etiqueta of Object.values(ETIQUETAS)) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Cerrar formulario' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar modal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeInTheDocument();
  });
});

describe.each([
  ['alta', undefined, () => crearReserva],
  ['edición', EXISTENTE, () => modificarReserva],
] as const)('ReservaFormDialog: cerrar el modal de %s', (_modo, reserva, apiLlamada) => {
  it.each(['Cancelar', 'X', 'Escape', 'Fondo'] as MetodoDeCierre[])(
    '«%s» cierra el modal sin enviar nada',
    async (metodo) => {
      const { onOpenChange, onGuardado } = abrir(reserva);
      if (!reserva) await completar();

      cerrarCon(metodo);

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(onGuardado).not.toHaveBeenCalled();
      expect(apiLlamada()).not.toHaveBeenCalled();
    },
  );
});

describe('ReservaFormDialog: validación local', () => {
  it('con campos vacíos no envía y marca cada uno como obligatorio', () => {
    abrir();

    guardar();

    expect(screen.getAllByText(/es obligatori[oa]\./)).toHaveLength(5);
    expect(screen.getByText('La mesa es obligatoria.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each(['0', 'abc'])(
    'con la cantidad %s advierte un entero positivo y no envía',
    async (cantidad) => {
      abrir();
      await completar({ cantidad });

      guardar();

      expect(screen.getByText(/cantidad de personas debe ser un entero positivo/)).toBeVisible();
      expect(crearReserva).not.toHaveBeenCalled();
    },
  );

  it('sin cliente no envía y muestra «El cliente es obligatorio.»', async () => {
    abrir();
    await completar({ cliente: 'ninguno' });

    guardar();

    expect(screen.getByText('El cliente es obligatorio.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each([
    ['Luis3', '280-4556677', 'El nombre debe contener solo letras'],
    ['', '280-4556677', 'El nombre es obligatorio'],
    ['Luis', '', 'El teléfono es obligatorio'],
  ])('con cliente nuevo «%s» y «%s» muestra «%s» y no envía', async (nombre, telefono, texto) => {
    abrir();
    await completar({ cliente: 'ninguno' });
    cargarClienteNuevo(nombre, telefono);

    guardar();

    expect(screen.getByText(texto)).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('con la mesa sin elegir no envía y marca Mesa como obligatoria', async () => {
    abrir();
    await completar({ mesa: '' });
    await esperarLista();

    guardar();

    expect(screen.getByText('La mesa es obligatoria.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });
});

// Supuesto S66 (corrección 2026-11-11, pendiente de validación del equipo)
describe('ReservaFormDialog: validación local del teléfono', () => {
  it.each([
    ['12345', 'El teléfono debe tener entre 6 y 15 dígitos'],
    ['- - -', 'El teléfono debe tener entre 6 y 15 dígitos'],
    ['1234567890123456', 'El teléfono debe tener entre 6 y 15 dígitos'],
    ['1'.repeat(300), 'El teléfono admite hasta 20 caracteres'],
  ])('con el teléfono «%s» muestra «%s» y no envía', async (telefono, texto) => {
    abrir();
    await completar({ cliente: 'ninguno' });
    cargarClienteNuevo('Luis', telefono);

    guardar();

    expect(screen.getByText(texto)).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  // Antes un caso de la validación local escribía «280+456» y esperaba «solo admite dígitos…».
  // Ahora el campo Teléfono descarta lo no permitido al escribir, así que ese texto ya no llega a la
  // validación (la regla de caracteres sigue cubierta en validarReserva.test.ts).
  it('lo que no es dígito, espacio, guion o + inicial se descarta al escribir el teléfono', async () => {
    abrir();
    await completar({ cliente: 'ninguno' });

    cargarClienteNuevo('Luis', 'abc280+456');

    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('280456');
    expect(screen.getByLabelText(/Teléfono/)).toHaveAttribute('maxlength', '20');
  });
});

/**
 * Decisión (corrección 2026-11-11): el alta valida la capacidad en el formulario porque el selector
 * ya conoce la de cada mesa; la edición no (la fila no trae la capacidad) y muestra el 409.
 */
describe('ReservaFormDialog: capacidad de la mesa (S67)', () => {
  it.each([
    ['5', '5', 'La mesa elegida admite hasta 4 personas.'],
    ['12', '3', 'La mesa elegida admite hasta 2 personas.'],
    ['12', '500', 'La mesa elegida admite hasta 2 personas.'],
  ])('en la mesa %s, %s personas advierten «%s» y no envía', async (mesa, cantidad, aviso) => {
    abrir();
    await completar({ mesa, cantidad });

    guardar();

    expect(screen.getByText(aviso)).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each([
    ['5', '4'],
    ['12', '2'],
  ])('en la mesa %s, %s personas (capacidad exacta) sí envía', async (mesa, cantidad) => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    await completar({ mesa, cantidad });

    guardar();

    await waitFor(() => expect(crearReserva).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/admite hasta/)).toBeNull();
  });

  it('con la mesa sin elegir no compara la cantidad: solo pide la mesa', async () => {
    abrir();
    await completar({ mesa: '', cantidad: '500' });
    await esperarLista();

    guardar();

    expect(screen.getByText('La mesa es obligatoria.')).toBeVisible();
    expect(screen.queryByText(/admite hasta/)).toBeNull();
  });

  it('el 409 de la API por capacidad se muestra como error general y conserva los datos', async () => {
    const detalle = 'La mesa 5 admite hasta 4 personas';
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    abrir();
    await completar();

    guardar();

    expect(await screen.findByText(detalle)).toBeVisible();
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
    expect(screen.getByRole('dialog', { name: 'Nueva reserva' })).toBeInTheDocument();
  });
});

describe('ReservaFormDialog: fecha y hora', () => {
  it('con una fecha anterior a hoy advierte y no envía', async () => {
    abrir();
    await completar({ fecha: '2026-11-01', mesa: '' });

    guardar();

    expect(screen.getByText('La fecha no puede ser anterior a hoy.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each(['11:30', '12:00'])('hoy con la hora %s advierte y no envía', async (hora) => {
    abrir();
    await completar({ fecha: '2026-11-02', hora, mesa: '' });

    guardar();

    expect(screen.getByText('La hora debe ser posterior a la hora actual.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('hoy con la hora 12:01 sí envía (límite)', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    await completar({ fecha: '2026-11-02', hora: '12:01' });

    guardar();

    expect(crearReserva).toHaveBeenCalledTimes(1);
  });
});

describe('ReservaFormDialog: selector de mesas', () => {
  it.each([
    ['recién abierto', {}],
    ['con una fecha anterior a hoy', { fecha: '2026-11-01', hora: '21:30' }],
    ['hoy con una hora pasada', { fecha: '2026-11-02', hora: '11:30' }],
    ['con la hora vacía', { fecha: '2026-11-03' }],
  ] as const)(
    '%s no pide la lista y deja el selector deshabilitado y sin opciones',
    async (_caso, campos) => {
      abrir();
      escribir(campos);
      await asentar();

      expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
      expect(listarMesasDisponibles).not.toHaveBeenCalled();
    },
  );

  it('con Fecha y Hora válidas pide la lista de ese turno y ofrece sus mesas', async () => {
    abrir();

    escribir({ fecha: '2026-11-02', hora: '21:30' });
    await esperarLista();

    expect(listarMesasDisponibles).toHaveBeenCalledExactlyOnceWith('2026-11-02', '21:30');
    expect(screen.getByRole('option', { name: 'Salón · Mesa 5 (4 personas)' })).toHaveValue('5');
    expect(screen.getByRole('option', { name: 'Terraza · Mesa 1 (2 personas)' })).toHaveValue('12');
  });

  it('con la lista vacía muestra el aviso y deshabilita Guardar reserva', async () => {
    vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([]));
    abrir();

    await completar({ mesa: '' });
    await screen.findByRole('option', { name: 'No hay mesas disponibles para esa fecha y hora' });

    expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeDisabled();
    guardar();
    expect(crearReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormDialog: lista de mesas cargando o con error', () => {
  it('mientras la lista carga, Guardar reserva no envía nada y marca Mesa como obligatoria', async () => {
    vi.mocked(listarMesasDisponibles).mockReturnValue(
      new Promise<RespuestaApi<MesaDisponible[]>>(() => undefined),
    );
    abrir();

    await completar({ mesa: '' });

    expect(screen.getByRole('option', { name: 'Cargando mesas…' })).toBeInTheDocument();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeEnabled();
    guardar();
    expect(screen.getByText('La mesa es obligatoria.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('con una mesa elegida, al cambiar la hora y guardar mientras carga la lista nueva no envía la mesa anterior', async () => {
    vi.mocked(listarMesasDisponibles)
      .mockResolvedValueOnce(conMesas([MESA_5, MESA_12]))
      .mockReturnValueOnce(new Promise<RespuestaApi<MesaDisponible[]>>(() => undefined));
    abrir();
    await completar();

    escribir({ hora: '22:00' });
    guardar();

    expect(screen.getByRole('option', { name: 'Cargando mesas…' })).toBeInTheDocument();
    expect(screen.getByText('La mesa es obligatoria.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('si la consulta de la lista falla muestra el mensaje junto a Mesa', async () => {
    const mensaje = 'La hora de la reserva debe ser posterior a la hora actual';
    vi.mocked(listarMesasDisponibles).mockResolvedValue({
      datos: null,
      exito: false,
      error: mensaje,
    });
    abrir();

    await completar({ mesa: '' });

    expect(await screen.findByText(mensaje)).toBeVisible();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

describe('ReservaFormDialog: cambiar la hora con una mesa elegida', () => {
  const CASOS: [string, MesaDisponible[], string][] = [
    ['borra la mesa que ya no figura', [MESA_12], ''],
    ['conserva la mesa que sigue disponible', [MESA_12, MESA_5], '5'],
  ];

  it.each(CASOS)('cambiar la hora %s', async (_caso, listaNueva, esperada) => {
    vi.mocked(listarMesasDisponibles)
      .mockResolvedValueOnce(conMesas([MESA_5, MESA_12]))
      .mockResolvedValueOnce(conMesas(listaNueva));
    abrir();
    await completar();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('5');

    escribir({ hora: '22:00' });
    await esperarLista();

    expect(listarMesasDisponibles).toHaveBeenLastCalledWith('2026-11-03', '22:00');
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue(esperada);
  });

  it('la mesa borrada no vuelve al volver al turno anterior', async () => {
    vi.mocked(listarMesasDisponibles)
      .mockResolvedValueOnce(conMesas([MESA_5, MESA_12]))
      .mockResolvedValueOnce(conMesas([MESA_12]))
      .mockResolvedValueOnce(conMesas([MESA_5, MESA_12]));
    abrir();
    await completar();
    escribir({ hora: '22:00' });
    await esperarLista();

    escribir({ hora: '21:30' });
    await esperarLista();

    expect(listarMesasDisponibles).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('');
  });
});

describe('ReservaFormDialog: envío', () => {
  it('envía los datos como números, avisa y notifica a quien lo abrió', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    const { onGuardado, onOpenChange } = abrir();
    await completar();

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearReserva).toHaveBeenCalledWith({
      mesa_id: 5,
      cliente_id: 7,
      fecha: '2026-11-03',
      hora: '21:30',
      cantidad_personas: 4,
    });
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva creada', variante: 'success' }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each(['5', '12'])('elegir la mesa %s y guardar envía su id como mesa_id', async (id) => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    const { onGuardado } = abrir();
    // S67: la mesa 12 es de capacidad 2; 2 personas entran en las dos mesas del caso
    await completar({ mesa: id, cantidad: '2' });

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearReserva).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ mesa_id: Number(id) }),
    );
  });

  it('mientras envía deshabilita «Guardar reserva» para no duplicar el alta', async () => {
    let resolver: (valor: { datos: Reserva; exito: true }) => void = () => undefined;
    vi.mocked(crearReserva).mockReturnValue(new Promise((resolve) => (resolver = resolve)));
    abrir();
    await completar();

    guardar();

    expect(await screen.findByRole('button', { name: 'Guardar reserva' })).toBeDisabled();
    resolver({ datos: CREADA, exito: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeEnabled(),
    );
  });
});

describe('ReservaFormDialog: errores del servidor', () => {
  it.each([
    'La mesa 5 ya tiene una reserva el 2026-11-02 a las 21:30; cada reserva ocupa la mesa 2 horas',
    'La mesa 99 no existe',
    'La fecha de la reserva no puede ser anterior a hoy',
  ])('muestra «%s» como error general y conserva los datos', async (detalle) => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir();
    await completar();

    guardar();

    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('5');
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
    expect(screen.getByRole('dialog', { name: 'Nueva reserva' })).toBeInTheDocument();
  });

  it('409 «La mesa 6 está fuera de servicio» al guardar se muestra como error general y conserva la mesa elegida', async () => {
    const detalle = 'La mesa 6 está fuera de servicio';
    vi.mocked(listarMesasDisponibles).mockResolvedValue(conMesas([MESA_5, MESA_6]));
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir();
    await completar({ mesa: '6' });

    guardar();

    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(crearReserva).toHaveBeenCalledWith(expect.objectContaining({ mesa_id: 6 }));
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('6');
  });

  it('si la respuesta no trae detalle muestra un error general', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false });
    abrir();
    await completar();

    guardar();

    expect(await screen.findByText('No se pudo crear la reserva')).toBeInTheDocument();
  });
});

describe('ReservaFormDialog: cliente registrado o nuevo', () => {
  it('guardar con un cliente elegido envía cliente_id 7 y no cliente_nuevo', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    await completar();

    guardar();

    await waitFor(() => expect(crearReserva).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(crearReserva).mock.calls[0]?.[0];
    expect(enviado).toMatchObject({ cliente_id: 7, mesa_id: 5 });
    expect(enviado).not.toHaveProperty('cliente_nuevo');
  });

  it('guardar con un cliente nuevo envía nombre y teléfono recortados y no cliente_id', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    await completar({ cliente: 'ninguno' });
    cargarClienteNuevo('  Luis Gómez  ', ' 280-4556677 ');

    guardar();

    await waitFor(() => expect(crearReserva).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(crearReserva).mock.calls[0]?.[0];
    expect(enviado).toMatchObject({
      cliente_nuevo: { nombre: 'Luis Gómez', telefono: '280-4556677' },
    });
    expect(enviado).not.toHaveProperty('cliente_id');
  });

  it('pasar de un cliente elegido a uno nuevo y al revés envía solo el último', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    await completar();
    cargarClienteNuevo('Luis Gómez', '280-4556677');
    await elegirCliente();

    guardar();

    await waitFor(() => expect(crearReserva).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(crearReserva).mock.calls[0]?.[0];
    expect(enviado).toHaveProperty('cliente_id', 7);
    expect(enviado).not.toHaveProperty('cliente_nuevo');
  });
});

describe('ReservaFormDialog: errores de la API con un cliente nuevo', () => {
  it('el 422 que nombra telefono se muestra junto al campo Teléfono y conserva los datos', async () => {
    const detalle =
      'Datos invalidos. telefono: telefono solo admite dígitos, espacios, guiones y + al inicio';
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    abrir();
    await completar({ cliente: 'nuevo' });

    guardar();

    const mensaje = await screen.findByText(detalle);
    expect(mensaje.id).toBe('reserva-cliente-telefono-error');
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Luis Gómez');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('280-4556677');
    expect(screen.getByRole('dialog', { name: 'Nueva reserva' })).toBeInTheDocument();
  });

  it('el 422 por largo o cantidad de dígitos del teléfono se muestra junto al campo Teléfono', async () => {
    const detalle =
      'Datos invalidos. cliente_nuevo.telefono: telefono debe tener entre 6 y 15 dígitos';
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    abrir();
    await completar({ cliente: 'nuevo' });

    guardar();

    const mensaje = await screen.findByText(detalle);
    expect(mensaje.id).toBe('reserva-cliente-telefono-error');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('280-4556677');
  });

  it('el 409 con un cliente nuevo es un error general y conserva Nombre y Teléfono', async () => {
    const detalle =
      'La mesa 5 ya tiene una reserva el 2026-11-03 a las 21:30; cada reserva ocupa la mesa 2 horas';
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    abrir();
    await completar({ cliente: 'nuevo' });

    guardar();

    expect(await screen.findByText(detalle)).toBeVisible();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Luis Gómez');
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('280-4556677');
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
  });
});

describe('ReservaFormDialog: modal de edición', () => {
  it('se titula «Modificar reserva» y trae los datos de la fila', () => {
    abrir(EXISTENTE);

    expect(screen.getByRole('dialog', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nueva reserva' })).toBeNull();
    expect(screen.getByLabelText(ETIQUETAS.fecha)).toHaveValue('2026-11-03');
    expect(screen.getByLabelText(ETIQUETAS.hora)).toHaveValue('21:30');
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeEnabled();
  });

  it('muestra Cliente y Mesa deshabilitados y deja editar los otros tres campos', () => {
    abrir(EXISTENTE);

    expect(screen.getByLabelText(/Cliente \(número\)/)).toHaveValue('7');
    expect(screen.getByLabelText(/Cliente \(número\)/)).toBeDisabled();
    expect(screen.queryByLabelText('Buscar cliente')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cliente nuevo' })).toBeNull();
    expect(buscarClientes).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('5');
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
    for (const campo of ['fecha', 'hora', 'cantidad'] as const) {
      expect(screen.getByLabelText(ETIQUETAS[campo])).toBeEnabled();
    }
  });

  it('la edición no pide la lista de mesas, tampoco al cambiar la fecha o la hora', async () => {
    abrir(EXISTENTE);
    await asentar();

    escribir({ fecha: '2026-11-04', hora: '22:00' });
    await asentar();

    expect(listarMesasDisponibles).not.toHaveBeenCalled();
  });

  it('la edición muestra Mesa de solo lectura con el mesa_id de la fila', () => {
    abrir({ ...EXISTENTE, mesa_id: 9 });

    const mesa = screen.getByLabelText(/Mesa \(número\)/);

    expect(mesa.tagName).toBe('INPUT');
    expect(mesa).toHaveValue('9');
    expect(mesa).toBeDisabled();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('«Cancelar» cierra el modal sin enviar el PUT, aun con cambios sin guardar', () => {
    const { onOpenChange, onGuardado } = abrir(EXISTENTE);
    escribir({ cantidad: '6' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(onGuardado).not.toHaveBeenCalled();
    expect(modificarReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormDialog: guardar la edición', () => {
  it('envía solo fecha, hora y cantidad, avisa y notifica a quien lo abrió', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: EXISTENTE, exito: true });
    const { onGuardado, onOpenChange } = abrir(EXISTENTE);
    escribir({ fecha: '2026-11-04', hora: '20:00', cantidad: '6' });

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarReserva).toHaveBeenCalledExactlyOnceWith(12, {
      fecha: '2026-11-04',
      hora: '20:00',
      cantidad_personas: 6,
    });
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva modificada', variante: 'success' }),
    );
    expect(crearReserva).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it.each([
    [{ fecha: '2026-11-01' }, 'La fecha no puede ser anterior a hoy.'],
    [{ cantidad: '0' }, 'La cantidad de personas debe ser un entero positivo.'],
  ])('con %j advierte «%s» y no envía el PUT', (cambio, aviso) => {
    abrir(EXISTENTE);
    escribir(cambio);

    guardar();

    expect(screen.getByText(aviso)).toBeVisible();
    expect(modificarReserva).not.toHaveBeenCalled();
  });
});

/** Alta con «Guardar reserva» pulsado, el componente desmontado y la solicitud resuelta después. */
async function altaNoAplicaRespuestaTardia(respuesta: RespuestaApi<Reserva>) {
  let resolver: (valor: RespuestaApi<Reserva>) => void = () => undefined;
  vi.mocked(crearReserva).mockReturnValue(new Promise((resolve) => (resolver = resolve)));
  const onGuardado = vi.fn();
  const { unmount } = render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ReservaFormDialog onOpenChange={vi.fn()} onGuardado={onGuardado} />
    </ToastContext.Provider>,
  );
  await completar();

  guardar();
  unmount();
  resolver(respuesta);
  await asentar();

  expect(mostrarToast).not.toHaveBeenCalled();
  expect(onGuardado).not.toHaveBeenCalled();
}

/** Lo mismo que `altaNoAplicaRespuestaTardia`, en modo edición con `modificarReserva`. */
async function edicionNoAplicaRespuestaTardia(respuesta: RespuestaApi<Reserva>) {
  let resolver: (valor: RespuestaApi<Reserva>) => void = () => undefined;
  vi.mocked(modificarReserva).mockReturnValue(new Promise((resolve) => (resolver = resolve)));
  const onGuardado = vi.fn();
  const { unmount } = render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ReservaFormDialog reserva={EXISTENTE} onOpenChange={vi.fn()} onGuardado={onGuardado} />
    </ToastContext.Provider>,
  );

  guardar();
  unmount();
  resolver(respuesta);
  await asentar();

  expect(mostrarToast).not.toHaveBeenCalled();
  expect(onGuardado).not.toHaveBeenCalled();
}

describe('ReservaFormDialog: guarda del guardado vigente (S38)', () => {
  it.each([
    ['con una respuesta buena', { datos: CREADA, exito: true } as RespuestaApi<Reserva>],
    [
      'con un error',
      {
        datos: null,
        exito: false,
        error:
          'La mesa 5 ya tiene una reserva el 2026-11-03 a las 21:30; cada reserva ocupa la mesa 2 horas',
      } as RespuestaApi<Reserva>,
    ],
  ])(
    'cerrar el modal de alta mientras se guarda no aplica una respuesta tardía (%s)',
    async (_caso, respuesta) => {
      await altaNoAplicaRespuestaTardia(respuesta);
    },
  );

  it.each([
    ['con una respuesta buena', { datos: EXISTENTE, exito: true } as RespuestaApi<Reserva>],
    [
      'con un error',
      { datos: null, exito: false, error: 'La reserva 12 no existe' } as RespuestaApi<Reserva>,
    ],
  ])(
    'cerrar el modal de edición mientras se guarda no aplica una respuesta tardía (%s)',
    async (_caso, respuesta) => {
      await edicionNoAplicaRespuestaTardia(respuesta);
    },
  );
});

describe('ReservaFormDialog: errores de la edición', () => {
  it.each([
    'La mesa 5 ya tiene una reserva el 2026-11-03 a las 21:30; cada reserva ocupa la mesa 2 horas',
    'La reserva 12 no está activa y no se puede modificar',
    'La reserva 12 no existe',
  ])('muestra «%s» como error general y deja el panel abierto', async (detalle) => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir(EXISTENTE);
    escribir({ cantidad: '6' });

    guardar();

    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('6');
    expect(screen.getByLabelText(/Cliente \(número\)/)).toBeDisabled();
    expect(screen.getByRole('dialog', { name: 'Modificar reserva' })).toBeInTheDocument();
  });

  // S67: la edición no conoce la capacidad de la mesa; el 409 de la API se ve dentro del formulario
  it('muestra el 409 por capacidad dentro del formulario y conserva la cantidad escrita', async () => {
    const detalle = 'La mesa 5 admite hasta 4 personas';
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir(EXISTENTE);
    escribir({ cantidad: '9' });

    guardar();

    expect(await screen.findByText(detalle)).toBeVisible();
    expect(modificarReserva).toHaveBeenCalledExactlyOnceWith(12, {
      fecha: '2026-11-03',
      hora: '21:30',
      cantidad_personas: 9,
    });
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('9');
    expect(screen.getByRole('dialog', { name: 'Modificar reserva' })).toBeInTheDocument();
  });

  it('si la respuesta no trae detalle muestra un error general de la modificación', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false });
    abrir(EXISTENTE);

    guardar();

    expect(await screen.findByText('No se pudo modificar la reserva')).toBeInTheDocument();
  });
});
