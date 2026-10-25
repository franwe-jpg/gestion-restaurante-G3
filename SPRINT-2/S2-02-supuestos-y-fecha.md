# S2-02 · Supuestos del equipo y fecha de entrega

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Franco Martín Soler · Sprint 2, semana 1 · Issue #163

La consigna no define algunos comportamientos, así que el equipo los resolvió con supuestos propios y trabaja sobre ellos. Este documento es **informativo**: los supuestos ya están adoptados y no hace falta confirmarlos para seguir avanzando. Quedan a disposición de la cátedra por si quiere revisarlos o hacer alguna observación.

## 1. Supuestos adoptados

| # | Supuesto | Fuente |
| --- | --- | --- |
| 1 | **Pagos.** El sistema registra el cobro y el medio de pago, pero no procesa el pago con un tercero (tarjeta, banco o billetera virtual). No se guardan números de tarjeta ni códigos de seguridad. | RNF-SEG-08 |
| 2 | **Volumen y carga.** El sistema se prueba con 10 usuarios a la vez y con una base de 5.000 comandas, 500 productos, 50 mesas, 20 mozos, 2.000 clientes y 1.000 reservas. Representa un restaurante mediano con unos 6 meses de operación. | RNF-REN-06 |
| 3 | **Tiempos de respuesta.** Con esa carga, en el 95 % de los casos: consultas y listados en 500 ms o menos, altas y modificaciones en 800 ms o menos, y reportes de hasta 6 meses en 3 s o menos. | RNF-REN-01, RNF-REN-02, RNF-REN-05 |
| 4 | **Comanda con reserva.** La consigna pide «Crear comanda con reserva». Lo interpretamos así: el mozo elige una reserva Activa del día, la comanda toma la mesa de esa reserva y la reserva pasa a Atendida. No se permite desde una reserva cancelada o ya atendida, y si la reserva es de otra fecha, el sistema avisa. | HU-M5-06 |

## 2. Fecha de entrega

El plan de trabajo fija la entrega final el **15/11/2026**. Es lo único que pedimos confirmar por escrito (un mail o un mensaje), para guardar la respuesta en el issue #163 (riesgo R20).
