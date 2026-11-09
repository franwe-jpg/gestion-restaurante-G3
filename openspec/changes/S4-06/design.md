# Diseño: S4-06 Página de inicio operativa

## Enfoque técnico

`/` muestra tres bloques independientes, cada uno con su propio `useApi` (carga, error con «Reintentar» y vacío). El mapa combina dos lecturas que ya existen (M3 y M5) y se clasifica con funciones puras. La caja usa un endpoint nuevo de solo lectura en M6. Los accesos rápidos navegan con `?nueva=1` y un hook común abre el alta.

## Decisiones

| Tema | Elegido | Descartado | Motivo |
| --- | --- | --- | --- |
| Caja | `GET /reportes/caja-del-dia` en `pagos/router.py`; `SUM`/`COUNT` con `GROUP BY` en `repository` | Calcular con `/facturas` en el frontend | D-11, D-28; evita N+1 |
| Día del restaurante | Intervalo semiabierto en UTC de 00:00 a 00:00 de `ZONA_DEL_RESTAURANTE` (UTC−3, ya en `comprobante_pdf`); `ahora` opcional en el service | Fecha enviada por el navegador | Fuera de alcance otro día; mismo criterio que M1 y M4; reloj inyectable en pruebas |
| Total cobrado | Suma en el service de las filas ya agrupadas | Tercera consulta | La agregación de cobros ya ocurre en la base |
| Medios dados de baja | `JOIN medios_pago` sin filtrar `eliminado` | Ocultarlos | Supuesto 4 |
| Mapa | `inicio/api.ts` pide todas las páginas (`limit=100`) de `/mesas` y `/reservas?fecha=hoy&estado=ACTIVA`; `mapaDelLocal.ts` clasifica, agrupa, cuenta y filtra | Endpoint nuevo en M3 | No se tocan M3 ni M5; lógica pura y fácil de probar |
| Tipos y fecha | Tipos mínimos y `hoyLocal` duplicados en `inicio/` | Importar de `modules/` | D-15 |
| `?nueva=1` | `shared/hooks/useAbrirDesdeUrl(parametro, abrir)`: si vale `1`, llama `abrir` y borra solo ese parámetro con `replace: true` | Copiar la lógica en cada página; `location.state` | Dos líneas por página, rebase simple con S4-03; conserva `?mesa=` |
| Accesos | `Link` con estilo de botón en `PageHeader.acciones` | `Button` + `useNavigate` | Enlace real: accesible y abre en otra pestaña |
| Plano generado con contorno irregular | Ni `Mesa` ni el local tienen posición o geometría: `planoDelLocal.ts` (puro) asigna tipo de ambiente (salón, salas, terraza), apila los ambientes y devuelve, en px del ancho medido, paredes exteriores e interiores, puertas (hoja + arco), ventanas, pasos, cocina y barra, la baranda curva y el área de mesas; `ContornoDelPlano` lo dibuja en un SVG decorativo (`aria-hidden`) detrás de las mesas, con `viewBox` igual al ancho medido para que arcos y grosores no se deformen. Mesas en una grilla dentro del área (3 columnas si son más de 6, 2 si no, menos si no entran). Ancho con `ResizeObserver` (`useAnchoDelElemento`; 640 px por defecto). Escala .78 compacta y .6 en teléfono; 1 y .75 con un solo sector. El filtro de estado atenúa en lugar de ocultar | Agregar posición a `Mesa` o un editor de plano (migración y M3); un rectángulo por sector; SVG con porcentajes y `preserveAspectRatio="none"` (deforma arcos y paredes) | Sin tocar el backend ni M3; parece un croquis real; la geometría es pura y se prueba sin DOM |
| Detalle de la mesa | Mesas como `button`; `MapaDelLocal` guarda la mesa elegida (contorno en el plano) y abre `DetalleDeMesaDialog` sobre el `Dialog` compartido. Carga perezosa con `useApi` dentro del diálogo: `obtenerComandaAbierta(mesaId)` (comandas de M4 + nombres de M1 y M2, armados con la función pura `armarComanda`) y `obtenerCliente(id)` (páginas de `/clientes`). La reserva ya viene con el mapa (`ReservaActiva` completa) | Pedir todo con el mapa; importar `api.ts` de `atencion` o `reservas`; endpoint nuevo `GET /clientes/{id}` | No carga datos que nadie mira; respeta D-15 y no toca el backend |
| Tarjetas estáticas | Se reemplazan | Mantenerlas | La maqueta no las tiene; el menú lateral ya navega |

## Flujo de datos

```text
Inicio ─┬─ AccesosRapidos ── Link /atencion?nueva=1 · /reservas?nueva=1
        │                         └─ useAbrirDesdeUrl → setAlta(true) / setPanel('alta')
        ├─ MapaDelLocal ── useApi(obtenerMapaDelLocal(hoyLocal()))
        │                     ├─ GET /mesas (todas las páginas)        [M3]
        │                     └─ GET /reservas?estado=ACTIVA (ídem)    [M5]
        │                  → clasificarMesas → agruparPorSector / contarPorEstado / filtrarMesas
                  → PlanoDelLocal → asignarTipos → generarPlano (paredes, puertas, ventanas, cocina, barra, baranda, área)
                                  ├─ ContornoDelPlano (SVG)  └─ MesaDelMapa (botón) ──▶ DetalleDeMesaDialog
                                                                  ├─ ComandaDeLaMesa ─ obtenerComandaAbierta: GET /comandas, /comandas/{id}, /productos, /menus-ejecutivos
                                                                  └─ ReservaDeLaMesa ─ obtenerCliente: GET /clientes
        └─ EstadoDeCaja ── useApi(obtenerCajaDelDia)
                              └─ GET /reportes/caja-del-dia → router → service → repository [M6]
```

## Contratos

```python
class CobradoPorMedio(BaseModel):
    medio_pago_id: int
    nombre: str
    tipo: TipoMedioPago
    cantidad: int
    total: Importe

class CajaDelDiaSalida(BaseModel):
    fecha: date                      # día del restaurante
    cobrado_por_medio: list[CobradoPorMedio]  # solo medios con cobros, por nombre
    total_cobrado: Importe
    facturas_adeudadas: int
    monto_adeudado: Importe          # suma de saldo_pendiente
```

- `repository.sumar_cobros_por_medio(db, desde, hasta)` y `repository.resumir_facturas_adeudadas(db) -> tuple[int, Decimal]` (con `coalesce`).
- `service.obtener_caja_del_dia(db, ahora: datetime | None = None)`: siempre `200`; sin cobros devuelve lista vacía y `0.00`. Redondea con `CENTAVO` (SQLite suma en coma flotante).
- Frontend: `EstadoVisibleMesa = 'LIBRE' | 'RESERVADA' | 'OCUPADA' | 'FUERA_DE_SERVICIO'`; `MesaDelMapa` agrega `estadoVisible` y `horaReserva?: string` (la más temprana del día). «Libres» cuenta `LIBRE` + `RESERVADA`.

## Cambios por archivo

| Archivo | Acción | Líneas (aprox.) |
| --- | --- | --- |
| `backend/app/modules/pagos/schemas.py` | Modificar | +20 |
| `backend/app/modules/pagos/repository.py` | Modificar | +30 |
| `backend/app/modules/pagos/service.py` | Modificar | +35 |
| `backend/app/modules/pagos/router.py` | Modificar | +6 |
| `backend/tests/modules/pagos/test_caja_del_dia.py` | Crear | +160 |
| `frontend/src/shared/components/inicio/types.ts`, `api.ts` | Crear | +95 |
| `frontend/src/shared/components/inicio/mapaDelLocal.ts` | Crear | +80 |
| `frontend/src/shared/components/inicio/AccesosRapidos.tsx`, `MapaDelLocal.tsx`, `FiltrosDelMapa.tsx` (`Select` + `Tabs` con cantidades), `MesaDelMapa.tsx`, `EstadoDeCaja.tsx` | Crear | +260 |
| `frontend/src/shared/components/Inicio.tsx` | Modificar | +25 / −93 |
| `frontend/src/shared/hooks/useAbrirDesdeUrl.ts` | Crear | +22 |
| `frontend/src/modules/atencion/pages/AtencionPage.tsx`, `reservas/pages/ReservasPage.tsx` | Modificar | +4 |
| Pruebas nuevas del frontend (`inicio/*.test.ts(x)`, `Inicio.test.tsx`, `useAbrirDesdeUrl.test.tsx`) | Crear | +425 |
| `AtencionPage.test.tsx`, `AtencionClientes.test.tsx`, `ReservasPage.test.tsx`, `App.test.tsx` | Modificar | +80 |

Backend ≈ 250 líneas. Frontend ≈ 1 000 agregadas y 93 borradas: supera el punto de control de 800; no se divide y se anota en el PR.

## Estrategia de pruebas (TDD estricto)

| Capa | Qué | Cómo |
| --- | --- | --- |
| Backend service/router | Agrupa por medio; excluye cobros de ayer en el borde 02:59/03:00 UTC; incluye medio eliminado; sin cobros da `[]` y `0.00`; adeudadas de cualquier fecha; importes como cadena | `Factura` y `Cobro` con `fecha_hora` explícita, `fabrica_medio_pago`, `ahora` fijo, `TestClient` |
| Pura | `clasificarMesas` (ocupada con reserva conserva su estado, hora más temprana), agrupación, conteo, filtros combinados, `formaDeMesa`, `cumpleEstado`, `describirMesa`; `planoDelLocal.ts`: `asignarTipos`, `distribuirEnArea`, `partirPared`, `dibujarPuerta` (sentido del arco), `generarPlano` (cocina y barra sin mesas encima, terraza curva con paso, salas alternadas con puerta), `escalaDelPlano` | Vitest sin DOM |
| `api.ts` | Pagina hasta `total`; propaga el primer error; comanda abierta (rutas, nombres, sin comanda, errores) y cliente (por páginas, no encontrado, error) | `clienteHttp` simulado |
| Detalle de la mesa | Un caso por estado, carga, error con «Reintentar», cliente no encontrado, cerrar; `armarComanda` y `horaDelDia` puros | `api` simulado con `vi.mock`, `MemoryRouter` |
| Bloques | Carga, error con reintento, vacío (sin mesas, sin cobros), camino feliz | `api` simulado con `vi.mock` |
| Hook y páginas | `?nueva=1` abre el alta y deja la URL sin el parámetro; otros parámetros se conservan | `MemoryRouter` |

Las pruebas de `AtencionPage` hoy se renderizan sin router: se agrega un `renderizarPagina(ruta)` con `MemoryRouter`. Si S4-03 se integra antes, se reutiliza su envoltorio.

## Matriz de amenazas

N/A: no hay enrutamiento de procesos, shell, subprocesos, automatización de VCS ni clasificación de ejecutables.

## Migración

No requiere migración ni model nuevo.

## Preguntas abiertas

- [ ] Validar los supuestos 1, 4 y 5 de la propuesta y el toque a M4, M5 y M6.
- [ ] `Supuesto:` la hora mostrada es la reserva `ACTIVA` más temprana del día, aunque ya haya pasado.
- [ ] `Supuesto:` si el navegador no está en UTC−3, el mapa y la caja pueden referirse a días distintos cerca de la medianoche.
