# Especificación · Página de inicio operativa (S4-06, capacidad `inicio-panel`)

**Estado:** BORRADOR para revisión · **Fuente:** issue #213, `proposal.md` y `exploration.md`. Guía visual (prioridad más baja): `SPRINT-2/S2-04-maqueta/index.html`.

## Contrato de datos (sin cambios en M3 ni M5)

| Bloque | Fuente | Uso |
| --- | --- | --- |
| Mapa: mesas | `GET /api/v1/mesas?limit=100&offset=…` (M3), `MesaSalida {id, numero, capacidad, sector {id, nombre}, estado}` | Se piden páginas hasta completar `total` |
| Mapa: reservas | `GET /api/v1/reservas?fecha=<hoy>&estado=ACTIVA` (M5), `ReservaSalida {mesa_id, hora, ...}` | Marca mesas «con reserva» |
| Caja | `GET /api/v1/reportes/caja-del-dia` (M6, ver `pagos-caja-del-dia`) | Cobrado hoy y adeudado |
| Detalle: comanda | `GET /api/v1/comandas?mesa_id=<id>&estado=ABIERTA&limit=1` y `GET /api/v1/comandas/{id}` (M4), `ComandaSalida {id, fecha_hora, detalles[{producto_id, menu_ejecutivo_id, cantidad, precio_unitario, descuento, estado_entrega}]}` | Comanda abierta de una mesa ocupada, al abrir su detalle |
| Detalle: nombres | `GET /api/v1/productos?estado=TODOS` (M1) y `GET /api/v1/menus-ejecutivos` (M2), todas las páginas | Nombre de cada línea |
| Detalle: cliente | `GET /api/v1/clientes` (M4), todas las páginas; la reserva trae `cliente_id` y `cantidad_personas` | Nombre del cliente de la reserva |

- El frontend vive en `frontend/src/shared/components/inicio/` con `api.ts` y `types.ts` propios sobre `clienteHttp` (D-16). No importa archivos de `modules/` (D-15): los tipos mínimos se duplican.
- La clasificación de mesas es una función pura, probada por separado.
- Los componentes no usan `fetch`. Prohibido `any`.
- Cada bloque carga, falla y se reintenta de forma independiente: el error de uno no oculta a los otros.

## Requisitos y escenarios

### R1 · Accesos rápidos
#### Escenario I01 (camino feliz)
- **Dado** que estoy en `/` **Cuando** hago clic en «Nueva comanda» **Entonces** navego a `/atencion?nueva=1`.
#### Escenario I02 (camino feliz)
- **Dado** que estoy en `/` **Cuando** hago clic en «Nueva reserva» **Entonces** navego a `/reservas?nueva=1`.
#### Escenario I03 (límite)
- **Dado** que fallan todos los bloques de datos **Cuando** miro `/` **Entonces** los dos accesos rápidos siguen visibles y funcionan (no dependen de la API).

### R2 · Mapa del local
- `Supuesto:` «Con reserva» = mesa `LIBRE` con una reserva `ACTIVA` hoy; muestra la hora más próxima. Una mesa `OCUPADA` o `FUERA_DE_SERVICIO` conserva su estado aunque tenga reserva.
- `Supuesto:` «Libres» incluye las libres con reserva (como la maqueta).
- `Supuesto:` hoy = fecha local del navegador (`hoyLocal()`, sin `toISOString()`).
- `Supuesto:` los sectores se obtienen de las mesas; las mesas se piden página por página hasta completar `total`.
- Estados mostrados: Libres, Con reserva, Ocupadas, Fuera de servicio.
- `Supuesto:` plano generado con contorno irregular. Ni `Mesa` ni el local guardan posición o geometría y no se agregan (sin backend ni migración). El plano se arma con reglas fijas, como el croquis de un arquitecto:
  - Tipo de ambiente: el sector interior con más mesas es el **salón**; el primero cuyo nombre es de exterior (terraza, patio, jardín, vereda, exterior, deck) es la **terraza** (si no hay, el primero que queda); los demás son **salas**. Orden de arriba abajo: salón, salas (por nombre), terraza.
  - Salón: contorno en L (retiro en la esquina de arriba a la izquierda con la puerta de entrada y el cartel «Entrada»), cocina rayada en la esquina de arriba a la derecha, barra a lo largo de la pared de arriba y ventanas en los costados. Las mesas van debajo de esa franja de servicio y nunca la pisan.
  - Salas: rectangulares, más angostas que el salón y alternando de lado (dejan retiros en el contorno), con una puerta en la pared que comparten con el ambiente de arriba y ventanas a los lados.
  - Terraza: al final, unida al ambiente de arriba por un paso en la pared común, con baranda (línea punteada, no pared) y el borde de abajo curvo.
  - Mesas de cada ambiente: por número, en una grilla de 3 columnas si son más de 6 y de 2 si no (menos si no entran en el ancho), con las filas que hagan falta; el alto del ambiente crece con sus filas. La ubicación no representa la disposición real del local.
- Forma por capacidad (como la maqueta): hasta 2 redonda con 2 sillas; hasta 4 cuadrada con 4; hasta 6 rectangular con 6; más de 6 rectangular larga con 8.
- Colores por estado (como la maqueta): libre gris; ocupada roja; con reserva gris con borde verde y la hora en una píldora sobre la mesa; fuera de servicio con borde punteado y fondo rayado. Una leyenda explica los cuatro.
- Cada mesa es un elemento no interactivo con texto accesible «Mesa <número>, <sector>, <estado>» (por ejemplo, «Mesa 5, Terraza, libre con reserva a las 23:00»).

#### Escenario I04 (camino feliz, plano por sector)
- **Dado** mesas de dos sectores **Cuando** cargo `/` **Entonces** el mapa dibuja un solo plano con un ambiente por sector (salón arriba, terraza abajo), paredes exteriores gruesas y la pared interior entre ambos con un paso, cada ambiente con el nombre del sector arriba a la izquierda; cada mesa muestra su número y «N pers.».
#### Escenario I05 (camino feliz, cantidades)
- **Dado** 8 mesas libres sin reserva, 3 libres con reserva, 4 ocupadas y 1 fuera de servicio **Cuando** cargo `/` **Entonces** los filtros de estado muestran Libres 11, Con reserva 3, Ocupadas 4 y Fuera de servicio 1.
#### Escenario I06 (filtro por estado)
- **Dado** el mapa cargado **Cuando** elijo el estado «Ocupadas» **Entonces** las mesas ocupadas se ven normales y las demás quedan atenuadas en su lugar (no se ocultan); las zonas siguen visibles.
#### Escenario I07 (filtro por sector)
- **Dado** el mapa cargado **Cuando** elijo un sector **Entonces** el plano dibuja solo el contorno de ese ambiente (con sus puertas, ventanas y, si es el salón, cocina y barra), más grande, y las cantidades de estado se recalculan para ese sector. El ambiente conserva su tipo (la terraza sigue curva). Con «Todos los sectores» el plano es compacto.
#### Escenario I08 (límite, filtros combinados)
- **Dado** un sector sin mesas ocupadas **Cuando** combino ese sector con «Ocupadas» **Entonces** se muestra el mensaje «No hay mesas con ese filtro» y la opción de quitar el filtro (el plano queda con todas sus mesas atenuadas).
#### Escenario I09 (límite, mesa con reserva)
- **Dado** una mesa `LIBRE` con reservas activas hoy a las 21:00 y a las 20:30 **Cuando** cargo `/` **Entonces** figura con borde verde, la píldora «20:30» y el texto accesible «… libre con reserva a las 20:30».
#### Escenario I10 (límite, estado propio prevalece)
- **Dado** una mesa `OCUPADA` con una reserva activa hoy **Cuando** cargo `/` **Entonces** figura «Ocupada» y no «Con reserva».
#### Escenario I11 (límite, más de una página)
- **Dado** 120 mesas **Cuando** cargo `/` **Entonces** se piden dos páginas y el mapa muestra las 120.
#### Escenario I12 (límite, vacío)
- **Dado** que no hay mesas registradas **Cuando** cargo `/` **Entonces** el mapa muestra «No hay mesas registradas» con las cantidades en 0, sin error y sin plano.
#### Escenario I13 (error)
- **Dado** que `GET /mesas` falla **Cuando** cargo `/` **Entonces** el bloque del mapa muestra el mensaje del backend (`detalle`) en un `Alert` con el botón «Reintentar», y los demás bloques siguen visibles.
#### Escenario I14 (error, reservas)
- **Dado** que `GET /reservas` falla pero `GET /mesas` responde **Cuando** cargo `/` **Entonces** el bloque del mapa muestra el error con «Reintentar» (no se muestra un mapa que oculte reservas sin avisar).
#### Escenario I15 (reintento)
- **Dado** el error del mapa **Cuando** hago clic en «Reintentar» y la API responde **Entonces** el mapa se muestra con los datos.
#### Escenario I16 (carga)
- **Dado** que la respuesta tarda **Cuando** cargo `/` **Entonces** cada bloque muestra su indicador de carga hasta recibir datos.

#### Escenario I22 (plano generado)
- **Dado** un sector con 3 mesas y otro con 7 **Cuando** cargo `/` **Entonces** el primero se dibuja en 2 columnas y 2 filas y el segundo en 3 columnas y 3 filas, con las mesas por número de izquierda a derecha y de arriba abajo, y la zona del segundo es más alta.
#### Escenario I23 (forma por capacidad)
- **Dado** mesas de capacidad 2, 4, 6 y 8 **Cuando** cargo `/` **Entonces** se dibujan redonda con 2 sillas, cuadrada con 4, rectangular con 6 y larga con 8.
#### Escenario I24 (estado y texto accesible)
- **Dado** una mesa libre, una ocupada, una con reserva y una fuera de servicio **Cuando** cargo `/` **Entonces** cada una tiene el color de su estado y es un botón con un texto accesible como «Mesa 2, Salón, ocupada».
#### Escenario I26 (salón: entrada, cocina y barra)
- **Dado** el mapa cargado **Cuando** miro el salón **Entonces** tiene un retiro con la puerta de entrada (hueco en la pared, hoja y arco de giro) y el cartel «Entrada», la cocina rayada con un paso, la barra y al menos dos ventanas (doble línea en un hueco de la pared); ninguna mesa pisa la cocina ni la barra.
#### Escenario I27 (terraza curva)
- **Dado** un sector «Terraza» **Cuando** cargo `/` **Entonces** se dibuja debajo del ambiente anterior, unida por un paso en la pared común, con baranda punteada y el borde de abajo curvo; sus mesas quedan dentro de la baranda.
#### Escenario I28 (salas extra)
- **Dado** cuatro sectores (salón, dos salas y terraza) **Cuando** cargo `/` **Entonces** las salas son más angostas que el salón, alternan de lado formando retiros en el contorno y cada una tiene una puerta hacia el ambiente de arriba.
#### Escenario I25 (límite, ancho de teléfono)
- **Dado** una pantalla de 375 px **Cuando** cargo `/` **Entonces** el plano se achica para entrar en el ancho y la página no tiene desplazamiento horizontal.

### R4 · Detalle de la mesa
- Cada mesa del plano es un botón (mouse y teclado). Al elegirla se marca con un contorno (como `.sel` de la maqueta) y se abre un `Dialog` compartido con «Mesa N», «<Sector> · N personas», el estado y el botón para cerrar. Al cerrar se desmarca.
- Los datos que faltan se piden al abrir el detalle, con su indicador de carga y su error con «Reintentar» dentro del diálogo.
- `Supuesto:` el número de la comanda es su `id` (no hay otro número) y la hora de inicio es `fecha_hora` en hora local de 24 horas.
- `Supuesto:` importe de una línea = `precio_unitario × cantidad − descuento` (como Atención al Público); una línea está entregada si `estado_entrega` es `ENTREGADO`. Si un producto o menú ya no figura, la línea se nombra «Producto n.º N» o «Menú n.º N».
- `Supuesto:` M4 no ofrece `GET /clientes/{id}`: se recorren las páginas de `GET /clientes` y se busca el id; si no aparece se muestra «Cliente n.º N» (como Reservas).
- «Nueva comanda» lleva a `/atencion?mesa=<id>` (el enlace de S4-03), que abre el alta con la mesa elegida.
- `Supuesto:` el detalle no incluye «Cerrar y cobrar» de la maqueta; «Ver comanda» lleva a Atención al Público.

#### Escenario I29 (abrir y cerrar)
- **Dado** el mapa cargado **Cuando** elijo una mesa con el mouse o con el teclado **Entonces** se marca en el plano y se abre su detalle con «Mesa N» y «<Sector> · N personas»; **Cuando** lo cierro (botón o Escape) **Entonces** la mesa se desmarca.
#### Escenario I30 (ocupada)
- **Dado** una mesa ocupada con una comanda abierta **Cuando** abro su detalle **Entonces** veo «N° <id>», la hora de inicio, las unidades entregadas sobre el total, cada línea con «cantidad× nombre», «Entregado» o «Pendiente» y su importe, el «Total a pagar» y el enlace «Ver comanda» a `/atencion`.
#### Escenario I31 (límite, ocupada sin comanda)
- **Dado** una mesa ocupada sin comanda abierta **Cuando** abro su detalle **Entonces** dice «No se encontró una comanda abierta para esta mesa.».
#### Escenario I32 (carga y error)
- **Dado** que la comanda tarda o falla **Cuando** abro el detalle **Entonces** se ve el indicador de carga y, si falla, el mensaje del backend con «Reintentar», que vuelve a pedirla.
#### Escenario I33 (con reserva)
- **Dado** una mesa libre con reserva hoy a las 21:30 de María Pérez para 5 personas **Cuando** abro su detalle **Entonces** veo «Reservada hoy a las 21:30», «María Pérez · 5 personas», «Mientras tanto la mesa se puede usar.», «La mesa está libre y no tiene una comanda abierta.» y «Nueva comanda».
#### Escenario I34 (límite, cliente no encontrado o error)
- **Dado** que el cliente de la reserva no aparece **Cuando** abro el detalle **Entonces** se muestra «Cliente n.º N · N personas»; si la consulta falla, el error con «Reintentar».
#### Escenario I35 (libre)
- **Dado** una mesa libre sin reserva **Cuando** abro su detalle **Entonces** dice «La mesa está libre y no tiene una comanda abierta.» y «Nueva comanda» lleva a `/atencion?mesa=<id>` de esa mesa, sin pedir datos.
#### Escenario I36 (fuera de servicio)
- **Dado** una mesa fuera de servicio **Cuando** abro su detalle **Entonces** dice «La mesa está fuera de servicio. Se habilita desde Salón y Mozos.».

### R3 · Estado de la caja
- Muestra: cobrado hoy por medio de pago, total cobrado, adeudado (cantidad de facturas y monto) y el enlace «Ir a Pagos» a `/pagos`.

#### Escenario I17 (camino feliz)
- **Dado** que la caja responde cobros en «Efectivo» y «Tarjeta» y 2 facturas adeudadas **Cuando** cargo `/` **Entonces** se listan los medios con su monto, el total cobrado, «2 facturas adeudadas» con su monto, y un enlace a `/pagos`.
#### Escenario I18 (límite, sin cobros hoy)
- **Dado** que la caja responde `por_medio_pago` vacía **Cuando** cargo `/` **Entonces** se muestra «Todavía no hay cobros hoy» y total `$0,00`; el adeudado y el enlace a Pagos siguen visibles.
#### Escenario I19 (límite, sin deuda)
- **Dado** `adeudado` con 0 facturas **Cuando** cargo `/` **Entonces** se muestra «No hay facturas adeudadas».
#### Escenario I20 (error)
- **Dado** que `GET /reportes/caja-del-dia` falla **Cuando** cargo `/` **Entonces** el bloque de caja muestra el mensaje del backend en un `Alert` con «Reintentar», y el mapa y los accesos siguen visibles.
#### Escenario I21 (formato)
- **Dado** un importe `"1500.00"` **Cuando** se muestra **Entonces** se formatea como moneda local con el mismo formateador que usa Pagos.

## Fuera de alcance
«Cerrar y cobrar» desde el detalle de la mesa, posición real de las mesas y forma real del local, actualización automática, otro día que no sea hoy, y cambios en los endpoints de M3 y M5.

**Diferencias con la maqueta (a anotar en el PR):** el detalle de la mesa no tiene «Cerrar y cobrar»; el contorno del local (salón en L, cocina, barra, salas, terraza curva) y la ubicación de las mesas se generan con reglas fijas, no son un dibujo a mano; el filtro de estado usa pestañas con cantidades en lugar de un selector; la caja se agrupa por medio de pago (nombre) y no por tipo.
