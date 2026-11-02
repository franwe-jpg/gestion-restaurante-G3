import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import type { RespuestaApi } from '../../../shared/types';
import { crearReserva, listarMesasDisponibles, modificarReserva } from '../api';
import type { MesaDisponible, Reserva } from '../types';

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

type Campos = Partial<Record<'cliente' | 'fecha' | 'hora' | 'cantidad', string>>;

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

/** Completa el alta; `mesa: ''` deja la mesa sin elegir (el selector puede no estar listo). */
async function completar({ mesa = '5', ...campos }: Campos & { mesa?: string } = {}) {
  escribir({ cliente: '7', fecha: '2026-11-03', hora: '21:30', cantidad: '4', ...campos });
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

  it('con Cliente 0 advierte un entero positivo y no envía', async () => {
    abrir();
    await completar({ cliente: '0' });

    guardar();

    expect(screen.getByText('El cliente debe ser un entero positivo.')).toBeVisible();
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
    await completar({ mesa: id });

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
    'La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30',
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

    expect(screen.getByLabelText(ETIQUETAS.cliente)).toHaveValue('7');
    expect(screen.getByLabelText(ETIQUETAS.cliente)).toBeDisabled();
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
        error: 'La mesa 5 ya tiene una reserva activa el 2026-11-03 a las 21:30',
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
    'La mesa 5 ya tiene una reserva activa el 2026-11-03 a las 21:30',
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
    expect(screen.getByLabelText(ETIQUETAS.cliente)).toBeDisabled();
    expect(screen.getByRole('dialog', { name: 'Modificar reserva' })).toBeInTheDocument();
  });

  it('si la respuesta no trae detalle muestra un error general de la modificación', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false });
    abrir(EXISTENTE);

    guardar();

    expect(await screen.findByText('No se pudo modificar la reserva')).toBeInTheDocument();
  });
});
