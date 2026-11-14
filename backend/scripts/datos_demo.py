"""Datos fijos de la demostracion: personas, salon, carta, menus, promociones y medios de pago.

Solo describe los datos; los carga `scripts.cargar_datos_demo` con los `service` de cada modulo.
"""

from dataclasses import dataclass, field

from app.modules.menus.models import DiaSemana, TipoPromocion
from app.modules.pagos.models import TipoMedioPago
from app.shared.models import Categoria

CONTRASENA_DEMO = "Resto123!"
CORREO_ENCARGADO = "encargado@gmail.com"
CORREO_MOZO = "mozo@gmail.com"
CORREO_CHEF = "chef@gmail.com"


@dataclass(frozen=True)
class PersonaDemo:
    correo: str
    nombre: str
    apellido: str
    dni: str
    telefono: str
    de_baja: bool = False  # se da de baja despues de cargar su historial


MOZOS = (
    PersonaDemo(CORREO_MOZO, "Martín", "Gómez", "30111222", "280-4512345"),
    PersonaDemo("sofia.perez@gmail.com", "Sofía", "Pérez", "33222333", "280-4523456"),
    PersonaDemo("diego.ramirez@gmail.com", "Diego", "Ramírez", "35333444", "280-4534567"),
    PersonaDemo("camila.torres@gmail.com", "Camila", "Torres", "38444555", "280-4545678"),
    PersonaDemo("nicolas.herrera@gmail.com", "Nicolás", "Herrera", "29555666", "280-4556789", True),
)

CHEFS = (
    PersonaDemo(CORREO_CHEF, "Laura", "Fernández", "27666777", "280-4567890"),
    PersonaDemo("julian.morales@gmail.com", "Julián", "Morales", "31777888", "280-4578901"),
)

# (nombre, descripcion, [(numero, capacidad), ...])
SECTORES = (
    (
        "Salón principal",
        "Salón central junto a la barra",
        ((1, 4), (2, 4), (3, 2), (4, 2), (5, 6), (6, 4), (7, 4), (8, 8)),
    ),
    ("Terraza", "Mesas al aire libre", ((1, 2), (2, 4), (3, 4), (4, 6), (5, 2))),
    ("Patio", "Patio interno con calefactores", ((1, 4), (2, 6), (3, 8))),
    ("Reservado", "Salón privado para grupos", ((1, 10), (2, 12))),
)
# Sector sin mesas que se da de baja: muestra el filtro de estado del listado.
SECTOR_DE_BAJA = ("Barra", "Banquetas de la barra, en remodelación")

SECCIONES = (
    "Entradas",
    "Pastas",
    "Platos principales",
    "Parrilla",
    "Menús",
    "Postres",
    "Bebidas sin alcohol",
    "Vinos y cervezas",
)
SECCION_MENUS = "Menús"


@dataclass(frozen=True)
class ProductoDemo:
    seccion: str
    categoria: Categoria
    nombre: str
    precio: str
    popularidad: int  # peso relativo al elegirlo en una comanda
    ingredientes: tuple[str, ...] = ()
    etiquetas: tuple[str, ...] = ()
    descripcion: str | None = None
    retirado: bool = False  # se vende solo en la parte vieja del historial y se da de baja


_P = Categoria.PLATO
_D = Categoria.POSTRE
_B = Categoria.BEBIDA

PRODUCTOS = (
    ProductoDemo("Entradas", _P, "Empanadas de carne (x3)", "7800", 9, ("Carne", "Cebolla")),
    ProductoDemo("Entradas", _P, "Provoleta", "8500", 7, ("Queso provolone", "Orégano")),
    ProductoDemo("Entradas", _P, "Rabas", "14500", 4, ("Calamar", "Harina", "Limón")),
    ProductoDemo("Entradas", _P, "Tabla de fiambres", "16000", 3, ("Jamón crudo", "Salame")),
    ProductoDemo("Entradas", _P, "Ensalada César", "10500", 5, ("Lechuga", "Pollo", "Croutons")),
    ProductoDemo(
        "Entradas", _P, "Burrata con tomates", "12000", 2, ("Burrata", "Tomate", "Albahaca")
    ),
    ProductoDemo(
        "Pastas", _P, "Sorrentinos de jamón y queso", "13500", 8, ("Jamón", "Queso", "Masa")
    ),
    ProductoDemo("Pastas", _P, "Ñoquis de papa", "11000", 7, ("Papa", "Harina", "Salsa fileto")),
    ProductoDemo("Pastas", _P, "Tallarines al pesto", "11500", 4, ("Tallarines", "Albahaca")),
    ProductoDemo("Pastas", _P, "Lasaña de carne", "14000", 6, ("Carne", "Masa", "Bechamel")),
    ProductoDemo("Pastas", _P, "Ravioles de verdura", "12500", 3, ("Acelga", "Ricota", "Masa")),
    ProductoDemo(
        "Pastas", _P, "Canelones de humita", "12500", 2, ("Choclo", "Masa"), ("vegetariano",)
    ),
    ProductoDemo(
        "Platos principales",
        _P,
        "Milanesa napolitana con papas",
        "16500",
        10,
        ("Carne", "Jamón", "Queso", "Papas"),
    ),
    ProductoDemo("Platos principales", _P, "Pollo al verdeo", "14500", 5, ("Pollo", "Verdeo")),
    ProductoDemo(
        "Platos principales", _P, "Merluza a la romana", "15000", 4, ("Merluza", "Rebozador")
    ),
    ProductoDemo(
        "Platos principales",
        _P,
        "Trucha a la manteca",
        "19500",
        3,
        ("Trucha", "Manteca", "Limón"),
        retirado=True,
    ),
    ProductoDemo(
        "Platos principales",
        _P,
        "Risotto de hongos",
        "15500",
        3,
        ("Arroz", "Hongos de pino"),
        ("vegetariano", "sin TACC"),
    ),
    ProductoDemo(
        "Platos principales",
        _P,
        "Cordero patagónico",
        "24000",
        6,
        ("Cordero", "Romero", "Papas"),
        descripcion="Cordero al horno de barro con papas rústicas",
    ),
    ProductoDemo(
        "Platos principales", _P, "Hamburguesa completa", "13000", 7, ("Carne", "Pan", "Huevo")
    ),
    ProductoDemo("Parrilla", _P, "Bife de chorizo", "21000", 8, ("Bife de chorizo",)),
    ProductoDemo("Parrilla", _P, "Vacío", "18500", 7, ("Vacío",)),
    ProductoDemo("Parrilla", _P, "Entraña", "22000", 5, ("Entraña",)),
    ProductoDemo(
        "Parrilla", _P, "Parrillada para dos", "38000", 4, ("Asado", "Chorizo", "Morcilla")
    ),
    ProductoDemo("Parrilla", _P, "Chorizo al pan", "6500", 3, ("Chorizo", "Pan")),
    ProductoDemo("Parrilla", _P, "Mollejas", "17000", 2, ("Mollejas", "Limón")),
    ProductoDemo(
        "Postres",
        _D,
        "Flan casero con dulce de leche",
        "6000",
        9,
        ("Huevo", "Leche", "Dulce de leche"),
    ),
    ProductoDemo("Postres", _D, "Tiramisú", "7500", 5, ("Mascarpone", "Café", "Vainillas")),
    ProductoDemo(
        "Postres", _D, "Panqueques con dulce de leche", "6500", 6, ("Panqueque", "Dulce de leche")
    ),
    ProductoDemo("Postres", _D, "Helado (dos bochas)", "5500", 7, ("Helado artesanal",)),
    ProductoDemo("Postres", _D, "Vigilante", "5000", 2, ("Queso", "Dulce de membrillo")),
    ProductoDemo("Postres", _D, "Brownie con helado", "7800", 4, ("Chocolate", "Nueces")),
    ProductoDemo(
        "Postres",
        _D,
        "Torta galesa",
        "7000",
        5,
        ("Frutas secas", "Azúcar negra"),
        descripcion="Receta tradicional del valle del Chubut",
    ),
    ProductoDemo("Bebidas sin alcohol", _B, "Agua mineral 500 ml", "2500", 9),
    ProductoDemo("Bebidas sin alcohol", _B, "Agua con gas 500 ml", "2500", 4),
    ProductoDemo("Bebidas sin alcohol", _B, "Gaseosa 500 ml", "3000", 8),
    ProductoDemo(
        "Bebidas sin alcohol", _B, "Limonada con menta y jengibre", "4500", 6, ("Limón", "Menta")
    ),
    ProductoDemo("Bebidas sin alcohol", _B, "Jugo de naranja exprimido", "4800", 3, ("Naranja",)),
    ProductoDemo("Bebidas sin alcohol", _B, "Café", "2800", 5),
    ProductoDemo("Vinos y cervezas", _B, "Pinta de cerveza rubia", "5500", 8),
    ProductoDemo("Vinos y cervezas", _B, "Pinta de cerveza roja", "5800", 5),
    ProductoDemo("Vinos y cervezas", _B, "Pinta de cerveza IPA", "6200", 6),
    ProductoDemo("Vinos y cervezas", _B, "Copa de Malbec", "5000", 7),
    ProductoDemo("Vinos y cervezas", _B, "Botella de Malbec", "18000", 4),
    ProductoDemo("Vinos y cervezas", _B, "Botella de Torrontés", "16000", 2),
    ProductoDemo("Vinos y cervezas", _B, "Fernet con cola", "6500", 5),
)

# Menus del dia: productos de categoria MENU_DEL_DIA que se dan de alta con el service de menus.
MENUS_DEL_DIA = (
    ProductoDemo(
        SECCION_MENUS,
        Categoria.MENU_DEL_DIA,
        "Guiso de lentejas",
        "10500",
        6,
        ("Lentejas", "Chorizo", "Panceta"),
    ),
    ProductoDemo(
        SECCION_MENUS,
        Categoria.MENU_DEL_DIA,
        "Pastel de papas",
        "11000",
        5,
        ("Papa", "Carne picada", "Huevo"),
    ),
)


@dataclass(frozen=True)
class MenuEjecutivoDemo:
    nombre: str
    precio_fijo: str
    productos: tuple[str, ...]
    descripcion: str


MENUS_EJECUTIVOS = (
    MenuEjecutivoDemo(
        "Ejecutivo clásico",
        "19500",
        ("Milanesa napolitana con papas", "Agua mineral 500 ml", "Flan casero con dulce de leche"),
        "Plato principal, bebida y postre, de lunes a viernes al mediodía",
    ),
    MenuEjecutivoDemo(
        "Ejecutivo de pastas",
        "16500",
        ("Ñoquis de papa", "Gaseosa 500 ml", "Helado (dos bochas)"),
        "Pasta del día, bebida y postre",
    ),
)

_SEMANA = tuple(DiaSemana)


@dataclass(frozen=True)
class PromocionDemo:
    nombre: str
    tipo: TipoPromocion
    productos: tuple[str, ...]
    desde_dias: int  # fecha_desde = hoy + desde_dias (negativo: en el pasado)
    hasta_dias: int
    dias_semana: tuple[DiaSemana, ...] = _SEMANA
    horario: tuple[int, int] | None = None  # (hora_desde, hora_hasta) en horas locales
    valores: dict[str, int | str] = field(default_factory=dict)  # campos propios del tipo
    descripcion: str | None = None
    finalizar: bool = False  # se finaliza despues de cargar el historial


PROMOCIONES = (
    PromocionDemo(
        "2x1 en pintas",
        TipoPromocion.NXM,
        ("Pinta de cerveza rubia", "Pinta de cerveza roja", "Pinta de cerveza IPA"),
        -42,
        28,
        (DiaSemana.JUEVES, DiaSemana.VIERNES, DiaSemana.SABADO),
        (20, 23),
        {"cant_lleva": 2, "cant_paga": 1},
        "Llevando dos pintas, se paga una",
    ),
    PromocionDemo(
        "Martes de pastas",
        TipoPromocion.PORCENTAJE,
        ("Sorrentinos de jamón y queso", "Ñoquis de papa", "Lasaña de carne"),
        -63,
        21,
        (DiaSemana.MARTES,),
        valores={"descuento_porcentaje": 20},
        descripcion="20 % de descuento en pastas seleccionadas",
    ),
    PromocionDemo(
        "Postre del mediodía",
        TipoPromocion.PRECIO_FIJO,
        ("Flan casero con dulce de leche", "Panqueques con dulce de leche"),
        -75,
        -21,
        horario=(12, 16),
        valores={"precio_fijo": "4500"},
        descripcion="Postres seleccionados a precio fijo en el almuerzo",
    ),
    PromocionDemo(
        "Limonada de temporada",
        TipoPromocion.PORCENTAJE,
        ("Limonada con menta y jengibre",),
        -30,
        60,
        valores={"descuento_porcentaje": 15},
        finalizar=True,
    ),
    PromocionDemo(
        "Semana de la parrilla",
        TipoPromocion.PORCENTAJE,
        ("Bife de chorizo", "Vacío", "Entraña"),
        7,
        14,
        valores={"descuento_porcentaje": 10},
        descripcion="Próxima promoción: cortes seleccionados con 10 % de descuento",
    ),
)

# (nombre, tipo, descripcion, peso relativo de uso)
MEDIOS_DE_PAGO = (
    ("Efectivo", TipoMedioPago.EFECTIVO, None, 30),
    ("Tarjeta de débito", TipoMedioPago.TARJETA, "Débito con posnet", 25),
    ("Tarjeta de crédito", TipoMedioPago.TARJETA, "Crédito en un pago", 20),
    ("Transferencia bancaria", TipoMedioPago.TRANSFERENCIA, "Alias del restaurante", 10),
    ("Billetera virtual", TipoMedioPago.BILLETERA_VIRTUAL, "Pago con código QR", 15),
)

CLIENTES = (
    "Ana López",
    "Bruno Castro",
    "Carla Medina",
    "Daniel Ortiz",
    "Elena Suárez",
    "Federico Díaz",
    "Gabriela Rojas",
    "Hernán Vega",
    "Inés Molina",
    "Javier Romero",
    "Karina Sosa",
    "Leandro Benítez",
    "Marina Acosta",
    "Nahuel Jones",
    "Olga Williams",
    "Pablo Giménez",
    "Romina Ríos",
    "Santiago Navarro",
    "Tamara Hughes",
    "Ulises Cabrera",
    "Valeria Domínguez",
    "Walter Ferreyra",
    "Ximena Luna",
    "Yamila Cardozo",
    "Zoe Evans",
    "Agustín Paz",
    "Belén Aguirre",
    "Cristian Vera",
    "Daniela Quiroga",
    "Esteban Roberts",
)

OBSERVACIONES = (
    "Sin sal",
    "Celíaco: sin TACC",
    "Cumpleaños, traer vela con el postre",
    "Carne bien cocida",
    "Traer los platos juntos",
    "Una porción para compartir",
)
