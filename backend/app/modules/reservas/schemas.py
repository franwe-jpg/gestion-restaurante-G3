"""reservas: entrada y salida de la API."""

from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_serializer, field_validator

from app.modules.reservas.models import EstadoReserva


class _DatosDelTurno(BaseModel):
    """Datos que comparten el alta y la modificacion: cuando y para cuantas personas."""

    model_config = ConfigDict(extra="forbid")  # S15: id y estado no se reciben

    fecha: date
    hora: time
    cantidad_personas: StrictInt = Field(gt=0)  # rechaza "4", 2.5 y true

    @field_validator("hora")
    @classmethod
    def _hora_en_minutos(cls, hora: time) -> time:
        """S16: la hora tiene precision de minutos y sin zona horaria."""
        if hora.second or hora.microsecond or hora.tzinfo is not None:
            raise ValueError("La hora debe tener el formato HH:MM, sin segundos ni zona horaria")
        return hora


class ReservaCrear(_DatosDelTurno):
    mesa_id: StrictInt = Field(gt=0)
    cliente_id: StrictInt = Field(gt=0)


class ReservaSalida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mesa_id: int
    cliente_id: int
    fecha: date
    hora: time
    cantidad_personas: int
    estado: EstadoReserva

    @field_serializer("hora")
    def _serializar_hora(self, hora: time) -> str:
        return hora.strftime("%H:%M")
