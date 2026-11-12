import { afterEach, describe, expect, it, vi } from 'vitest';

import { clienteHttp } from '../../shared/api/client';

import {
  crearMedioPago,
  descargarComprobantePdf,
  descargarReporteRecaudacionPdf,
  eliminarMedioPago,
  generarFactura,
  listarFacturas,
  listarMediosPago,
  modificarMedioPago,
  obtenerComprobante,
  obtenerFactura,
  obtenerReporteRecaudacion,
  previsualizarFactura,
  registrarCobro,
} from './api';
import type {
  CobroCrear,
  FacturaCrear,
  MedioPago,
  MedioPagoCrear,
  MedioPagoModificar,
} from './types';

const EFECTIVO: MedioPago = {
  id: 1,
  nombre: 'Efectivo',
  tipo: 'EFECTIVO',
  descripcion: null,
  estado: 'HABILITADO',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api de medios de pago', () => {
  it('crea por POST a /medios-de-pago sin enviar el estado (HU-M6-04)', async () => {
    const datos: MedioPagoCrear = { nombre: 'Efectivo', tipo: 'EFECTIVO', descripcion: null };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: EFECTIVO, exito: true });

    const respuesta = await crearMedioPago(datos);

    expect(post).toHaveBeenCalledWith('/medios-de-pago', datos);
    expect(respuesta.datos).toEqual(EFECTIVO);
  });

  it('modifica por PUT con el estado (HU-M6-05)', async () => {
    const datos: MedioPagoModificar = {
      nombre: 'Efectivo',
      tipo: 'EFECTIVO',
      descripcion: null,
      estado: 'DESHABILITADO',
    };
    const put = vi.spyOn(clienteHttp, 'put').mockResolvedValue({ datos: EFECTIVO, exito: true });

    await modificarMedioPago(1, datos);

    expect(put).toHaveBeenCalledWith('/medios-de-pago/1', datos);
  });

  it('elimina por DELETE (HU-M6-06)', async () => {
    const borrar = vi.spyOn(clienteHttp, 'delete').mockResolvedValue({ datos: null, exito: true });

    await eliminarMedioPago(3);

    expect(borrar).toHaveBeenCalledWith('/medios-de-pago/3');
  });

  it('lista solo habilitados por defecto y suma deshabilitados a pedido (HU-M6-07)', async () => {
    const get = vi
      .spyOn(clienteHttp, 'get')
      .mockResolvedValue({ datos: { items: [], total: 0, limit: 50, offset: 0 }, exito: true });

    await listarMediosPago(50, 0, false);
    await listarMediosPago(50, 50, true);

    expect(get).toHaveBeenNthCalledWith(1, '/medios-de-pago?limit=50&offset=0');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/medios-de-pago?limit=50&offset=50&incluir_deshabilitados=true',
    );
  });
});

describe('api de facturas (HU-M6-01)', () => {
  it('pide la vista previa por GET con el número de comanda', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await previsualizarFactura(12);

    expect(get).toHaveBeenCalledWith('/facturas/previsualizar?comanda_id=12');
  });

  it('genera la factura por POST a /facturas con el primer cobro', async () => {
    const datos: FacturaCrear = { comanda_id: 12, cobro: { medio_pago_id: 1, monto: '7101.00' } };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: null, exito: true });

    await generarFactura(datos);

    expect(post).toHaveBeenCalledWith('/facturas', datos);
  });
});

describe('api de cobros (HU-M6-02)', () => {
  it('lista las facturas por GET con la paginación', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await listarFacturas(50, 100);

    expect(get).toHaveBeenCalledWith('/facturas?limit=50&offset=100');
  });

  it('pide una factura por GET con su id', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await obtenerFactura(7);

    expect(get).toHaveBeenCalledWith('/facturas/7');
  });

  it('registra el cobro por POST en la factura elegida', async () => {
    const datos: CobroCrear = { medio_pago_id: 2, monto: '3000.00' };
    const post = vi.spyOn(clienteHttp, 'post').mockResolvedValue({ datos: null, exito: true });

    await registrarCobro(7, datos);

    expect(post).toHaveBeenCalledWith('/facturas/7/cobros', datos);
  });
});

describe('api de comprobantes (HU-M6-03)', () => {
  it('pide el comprobante por GET con su número', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await obtenerComprobante(12);

    expect(get).toHaveBeenCalledWith('/comprobantes/12');
  });

  it('descarga el PDF del comprobante como archivo', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const obtenerArchivo = vi
      .spyOn(clienteHttp, 'obtenerArchivo')
      .mockResolvedValue({ datos: blob, exito: true });

    const respuesta = await descargarComprobantePdf(12);

    expect(obtenerArchivo).toHaveBeenCalledWith('/comprobantes/12/pdf');
    expect(respuesta.datos).toBe(blob);
  });
});

describe('api del reporte de recaudación (HU-M6-08)', () => {
  it('pide el reporte por GET con el período en la query', async () => {
    const get = vi.spyOn(clienteHttp, 'get').mockResolvedValue({ datos: null, exito: true });

    await obtenerReporteRecaudacion('2026-10-01', '2026-10-31');

    expect(get).toHaveBeenCalledWith(
      '/reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-10-01&fecha_hasta=2026-10-31',
    );
  });

  it('descarga el PDF del reporte como archivo', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const obtenerArchivo = vi
      .spyOn(clienteHttp, 'obtenerArchivo')
      .mockResolvedValue({ datos: blob, exito: true });

    const respuesta = await descargarReporteRecaudacionPdf('2026-10-01', '2026-10-31');

    expect(obtenerArchivo).toHaveBeenCalledWith(
      '/reportes/recaudacion-por-medio-de-pago/pdf?fecha_desde=2026-10-01&fecha_hasta=2026-10-31',
    );
    expect(respuesta.datos).toBe(blob);
  });
});
