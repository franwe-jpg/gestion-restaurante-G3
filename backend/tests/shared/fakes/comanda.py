"""Synthetic Comanda service double; no database or production module access."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from app.shared.contratos.comanda import (
    ComandaCrear,
    ComandaResumen,
    ComandaSalida,
    DetalleComandaCrear,
    DetalleComandaSalida,
    EstadoComanda,
    EstadoEntrega,
)
from app.shared.excepciones import DatosInvalidosError, NoEncontradoError, ReglaDeNegocioError
from app.shared.paginacion import Pagina, ParametrosPaginacion


@dataclass(frozen=True)
class CatalogoValor:
    precio_unitario: Decimal
    descuento: Decimal
    promocion_id: int | None


@dataclass
class ReservaFake:
    mesa_id: int
    fecha: date
    estado: str = "ACTIVA"
    comanda_id: int | None = None


class ComandaFake:
    def __init__(
        self,
        mesas: dict[int, str],
        catalogo: dict[tuple[str, int], CatalogoValor],
        reloj: Callable[[], datetime],
        reservas: dict[int, ReservaFake] | None = None,
        comandas_iniciales: list[ComandaSalida] | None = None,
    ) -> None:
        self.mesas = mesas.copy()
        self.catalogo = catalogo.copy()
        self.reloj = reloj
        self.reservas = {k: ReservaFake(**vars(v)) for k, v in (reservas or {}).items()}
        self._comandas = {c.id: c.model_copy(deep=True) for c in (comandas_iniciales or [])}

    def _detalle(self, datos: DetalleComandaCrear) -> DetalleComandaSalida:
        clave = (
            ("producto", datos.producto_id)
            if datos.producto_id is not None
            else ("menu", datos.menu_ejecutivo_id)
        )
        valor = self.catalogo.get(clave)
        if valor is None:
            raise NoEncontradoError("El producto o menú no existe")
        return DetalleComandaSalida(
            **datos.model_dump(),
            precio_unitario=valor.precio_unitario,
            descuento=valor.descuento,
            promocion_id=valor.promocion_id,
            estado_entrega=EstadoEntrega.PENDIENTE,
        )

    def crear_comanda(self, datos: ComandaCrear) -> ComandaSalida:
        if not datos.detalles:
            raise DatosInvalidosError("La comanda necesita al menos un detalle")
        if datos.mesa_id not in self.mesas:
            raise NoEncontradoError("La mesa no existe")
        if any(
            c.mesa_id == datos.mesa_id and c.estado == EstadoComanda.ABIERTA
            for c in self._comandas.values()
        ):
            raise ReglaDeNegocioError("La mesa ya tiene una comanda abierta")
        detalles = [self._detalle(d) for d in datos.detalles]
        comanda_id = max(self._comandas, default=0) + 1
        comanda = ComandaSalida(
            id=comanda_id,
            mesa_id=datos.mesa_id,
            estado=EstadoComanda.ABIERTA,
            fecha_hora=self.reloj(),
            observaciones=datos.observaciones,
            detalles=detalles,
        )
        self._comandas[comanda_id] = comanda
        if self.mesas[datos.mesa_id] == "LIBRE":
            self.mesas[datos.mesa_id] = "OCUPADA"
        return comanda.model_copy(deep=True)

    def consultar_comanda(self, comanda_id: int) -> ComandaSalida:
        if comanda_id not in self._comandas:
            raise NoEncontradoError("La comanda no existe")
        return self._comandas[comanda_id].model_copy(deep=True)

    def listar_comandas(
        self,
        parametros: ParametrosPaginacion | None = None,
        mesa_id: int | None = None,
        estado: str | None = None,
    ) -> Pagina[ComandaResumen]:
        parametros = parametros or ParametrosPaginacion()
        comandas = [
            c
            for c in self._comandas.values()
            if (mesa_id is None or c.mesa_id == mesa_id) and (estado is None or c.estado == estado)
        ]
        comandas.sort(key=lambda c: (c.fecha_hora, c.id), reverse=True)
        return Pagina[ComandaResumen](
            items=[
                ComandaResumen.model_validate(c.model_dump())
                for c in comandas[parametros.offset : parametros.offset + parametros.limit]
            ],
            total=len(comandas),
            limit=parametros.limit,
            offset=parametros.offset,
        )

    def cerrar_comanda(self, comanda_id: int) -> ComandaSalida:
        actual = self.consultar_comanda(comanda_id)
        if actual.estado != EstadoComanda.ABIERTA:
            raise ReglaDeNegocioError("Solo una comanda abierta puede cerrarse")
        if any(d.estado_entrega == EstadoEntrega.PENDIENTE for d in actual.detalles):
            raise ReglaDeNegocioError("Hay productos pendientes: revise y marque las entregas")
        cerrada = actual.model_copy(update={"estado": EstadoComanda.CERRADA}, deep=True)
        self._comandas[comanda_id] = cerrada
        return cerrada.model_copy(deep=True)

    def crear_desde_reserva(
        self, reserva_id: int, detalles: list[DetalleComandaCrear]
    ) -> ComandaSalida:
        reserva = self.reservas.get(reserva_id)
        if reserva is None:
            raise NoEncontradoError("La reserva no existe")
        if reserva.estado != "ACTIVA":
            raise ReglaDeNegocioError("La reserva no está activa")
        if reserva.fecha != self.reloj().date():
            raise ReglaDeNegocioError("La fecha de la reserva no corresponde a hoy")
        if not any(d.producto_id is not None for d in detalles):
            raise DatosInvalidosError("El pedido de reserva necesita al menos un producto")
        datos = ComandaCrear(mesa_id=reserva.mesa_id, detalles=detalles)
        creada = self.crear_comanda(datos)
        self._comandas[creada.id] = creada.model_copy(update={"reserva_id": reserva_id}, deep=True)
        reserva.estado = "ATENDIDA"
        reserva.comanda_id = creada.id
        return self.consultar_comanda(creada.id)
