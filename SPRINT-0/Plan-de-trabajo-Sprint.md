# Plan de trabajo · Sprint 0

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Ingeniería de Software III (4.º año) · UNPSJB, Facultad de Ingeniería, Sede Trelew\
Docentes: Sebastián Schanz y Guillermo Urrutia\
Equipo: Franco Martín Soler, Juan Ignacio Riquelme, Joaquín Cardoso Díaz, Federico Cabaña, Giuliano Giannoncelli y Héctor Sánchez\
Repositorio: `franwe-jpg/gestion-restaurante-G3` · Stack fijado por la cátedra: React, FastAPI y SQLite

## 1. Uso de IA y agentes

El equipo trabaja con Spec Driven Development (SDD) asistido por agentes de IA. Como no todos usamos la misma herramienta, las reglas viven en un archivo `AGENTS.md` en la raíz del repositorio, que cualquier agente reconoce: cómo se escribe una spec antes de codificar, los estándares de frontend y backend, el formato de ramas acordado, la estructura de carpetas y la obligación de que todo lo generado pase por revisión humana antes de integrarse. Quien usa Claude Code tiene además un `CLAUDE.md` que remite a `AGENTS.md` y solo agrega lo específico de esa herramienta, para que haya una única fuente de reglas. Ambos archivos se definen en el Sprint 1 (S1-03 y S1-04); hasta entonces rige `SPRINT-0/AGENTS.md`, con las reglas mínimas para trabajar en este sprint.

La IA también se usa en la planificación: Claude Code genera el Product Backlog base a partir del story map de este plan, y después cada integrante revisa, corrige y aprueba las historias de su módulo. Lo que se entrega a la cátedra es responsabilidad del equipo, no del agente.

## 2. Marco de trabajo

Aplicamos Scrum sin Product Owner: el equipo completo cumple el rol de Scrum Master y toma las decisiones de producto a partir de la consigna. El trabajo es educativo, así que no hay cliente real; aun así, como lo pide la consigna, la estimación por Puntos de Función del Sprint 1 incluye una cotización. Las etapas de análisis y diseño se trabajan en sprints de 2 semanas y la implementación en sprints de 1 semana, todos con bastante carga de tareas. El Sprint 0 empieza hoy, 24/09/2026, y la entrega final se fija el 15/11/2026 (a confirmar con la cátedra).

## 3. Qué pide la cátedra y qué cubre este sprint

La consigna organiza los entregables en tres etapas: Planificación y Gestión (Product Backlog con HU y criterios Dado/Cuando/Entonces, análisis de riesgos con línea de corte, y plan de desarrollo e hitos); Arquitectura, Diseño y Estimación (RNF, decisiones de diseño, diagrama de clases y Puntos de Función); Implementación, Pruebas y Despliegue (estándares, criterios de conformidad, pruebas automatizadas, GitFlow y CI). A eso se suma una evaluación de Cierre post-desarrollo (métricas finales, calidad de código y retrospectiva de riesgos). Además exige al menos 6 reportes.

El profesor Urrutia confirmó que en esta primera etapa podemos avanzar con todo Planificación y Gestión, más los RNF, las decisiones de diseño, el diagrama de clases y la definición de estándares y guías de estilo. Para no sobrecargar el Sprint 0, su alcance es Planificación y Gestión completa más los RNF, las decisiones de arquitectura y el diagrama de clases, que son la base para contar Puntos de Función. Los estándares de codificación, `AGENTS.md`, `CLAUDE.md` y los esqueletos pasan al Sprint 1, junto con la estimación por Puntos de Función: no se necesitan hasta que empiece la implementación y son la base de los criterios de conformidad y de la CI.

## 4. División por módulos

Los requerimientos de la consigna se agrupan en 6 módulos, uno por integrante. Cada uno revisa las HU, identifica los riesgos, diseña su parte del diagrama de clases y define un reporte de su módulo; así se cubren los 6 reportes que pide la consigna. La idea es que cada integrante siga con el mismo módulo en los sprints siguientes, haciendo la tarea que corresponda a cada etapa (estimación, pruebas, implementación).

| Módulo | Responsable | Alcance | Reporte propuesto |
| --- | --- | --- | --- |
| M1 Productos y Carta | Franco Martín Soler | Platos, postres, bebidas y secciones de la carta (14 RF) | Productos más vendidos por período |
| M2 Menús y Promociones | Joaquín Cardoso Díaz | Menú ejecutivo, menú del día y promociones (9 RF) | Ventas de menús y promociones por período |
| M3 Salón y Mozos | Giuliano Giannoncelli | Mesas, sectores y mozos (12 RF) | Mesas atendidas y ventas por mozo |
| M4 Atención al Público | Juan Ignacio Riquelme | Clientes y ciclo de la comanda (10 RF) | Comandas y ticket promedio por día/turno |
| M5 Reservas | Federico Cabaña | Reservas, cancelaciones y comanda con reserva (6 RF) | Reservas y ausentismo por período |
| M6 Pagos | Héctor Sánchez | Facturas, cobros, comprobantes y medios de pago (7 RF) | Recaudación por medio de pago y deuda pendiente |

Los reportes son una propuesta inicial: cada responsable la valida o la cambia en su tarea «Definir el reporte del módulo». Las tareas transversales se reparten según la carga de cada módulo. Las escalas de riesgo son las de la Unidad 2 y el diagrama se hace en UML, así que no hacen falta tareas aparte para definirlos.

## 5. Backlog del Sprint 0 (24/09 – 07/10)

Todas las tareas son individuales. La columna «Depende de» indica qué tarea tiene que estar terminada antes de empezar. Las tareas y las HU ya están cargadas como issues en el GitHub Project, con el campo «Sprint» asignado, y desde ahora se editan ahí. La planilla `G3_Backlog_Sprint0.xlsx` queda para riesgos y roadmap. El script `cargar_github.py` ya se corrió y no hay que volver a correrlo, porque duplica los issues.

### Tareas transversales

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S0-01 | Plan de desarrollo e hitos | Franco Martín Soler | — | 1 |
| S0-02 | Crear repositorios y tablero Project | Franco Martín Soler | — | 1 |
| S0-03 | Generar Product Backlog base con Claude Code | Franco Martín Soler | S0-02 | 1 |
| S0-04 | Requerimientos No Funcionales (RNF) | Héctor Sánchez | — | 1 |
| S0-05 | Decisiones de arquitectura y diseño | Héctor Sánchez | S0-04 | 1 |
| S0-08 | Priorización del Product Backlog + DoR/DoD | Joaquín Cardoso Díaz | S0-M1b, S0-M2b, S0-M3b, S0-M4b, S0-M5b, S0-M6b | 2 |
| S0-09 | Integración del diagrama de clases | Juan Ignacio Riquelme | S0-M1d, S0-M2d, S0-M3d, S0-M4d, S0-M5d, S0-M6d | 2 |
| S0-10 | Consolidar matriz de riesgos y línea de corte | Giuliano Giannoncelli | S0-M1c, S0-M2c, S0-M3c, S0-M4c, S0-M5c, S0-M6c | 2 |
| S0-11 | Gateway G0: revisión de artefactos | Todo el equipo | S0-01, S0-04, S0-05, S0-08, S0-09, S0-10 | 2 |

### Tareas por módulo

Cada responsable hace las cuatro tareas de su módulo: revisar las HU (a), definir el reporte (b), identificar sus riesgos (c) y diseñar su parte del diagrama de clases (d).

| Tarea | Depende de | Semana |
| --- | --- | --- |
| a · Revisar y ajustar HU del módulo | S0-03 | 1 |
| b · Definir el reporte del módulo | a | 2 |
| c · Riesgos del módulo | a | 2 |
| d · Diagrama de clases del módulo | a | 2 |

Por ejemplo, las tareas de Juan (Atención al Público) son S0-M4a, S0-M4b, S0-M4c y S0-M4d.

### Orden de las dependencias

El camino crítico empieza en S0-02 y S0-03 (Franco): sin el backlog base nadie puede revisar las HU de su módulo, así que conviene tenerlo en los primeros dos o tres días. En paralelo, sin depender de nadie, arrancan el plan (S0-01) y los RNF (S0-04). Los RNF alimentan las decisiones de arquitectura (S0-05), que después usan los estándares del Sprint 1. En la segunda semana, las tareas de cada módulo se integran en tres consolidaciones (los IDs S0-06 y S0-07 quedaron sin usar): priorización del backlog (S0-08), diagrama único (S0-09) y matriz de riesgos con línea de corte (S0-10). Todo converge en el gateway G0 (S0-11).

### Gateway G0 (07/10)

El sprint se cierra con una revisión cruzada: cada integrante revisa el trabajo de otro módulo. Para aprobar G0 tiene que haber un Product Backlog priorizado con criterios de aceptación, una matriz de riesgos ordenada por exposición con la línea de corte justificada y un plan de reducción y otro de contingencia para cada riesgo, como pide la consigna, el plan de desarrollo con roles e hitos, los RNF, las decisiones de arquitectura y el diagrama de clases integrado.

Para el análisis de riesgos se usa lo visto en la Unidad 2: probabilidad entre 0 y 1, impacto de 1 (despreciable) a 4 (catastrófico) y exposición E = P × I. La probabilidad se estima a ciegas (Delphi de banda ancha) para evitar el anclaje, y la línea de corte se traza donde se acaba la capacidad del equipo de gestionar riesgos activamente.

## 6. Próximas etapas

| Sprint | Fechas | Alcance | Gateway |
| --- | --- | --- | --- |
| Sprint 1 | 08/10 – 21/10 (2 semanas) | Estimación por PF (PFNA, 14 factores, LDC, esfuerzo y cotización), estándares de codificación, `AGENTS.md` y `CLAUDE.md`, esqueletos, criterios de conformidad, diseño de pruebas, GitFlow y CI | G1 · 21/10 |
| Sprint 2 | 22/10 – 28/10 (1 semana) | Implementación: entidades base y ABM de cada módulo, con tests | — |
| Sprint 3 | 29/10 – 04/11 (1 semana) | Implementación: flujos (comanda, reserva, facturación, promociones) | G2 · 04/11 |
| Sprint 4 | 05/11 – 11/11 (1 semana) | Implementación: reportes, integración entre módulos y correcciones | — |
| Cierre | 12/11 – 15/11 (4 días) | Métricas LDC vs. estimación, análisis estático, retrospectiva de riesgos y entrega | Entrega · 15/11 (a confirmar) |

En todas las etapas se mantiene la división por módulos: en el Sprint 1 cada uno cuenta los Puntos de Función de su módulo, y en implementación cada uno construye y prueba el suyo. Los sprints de implementación son cortos para cinco semanas de proyecto, así que el plazo es en sí mismo un riesgo que tiene que aparecer en la matriz.

### Tareas ya definidas del Sprint 1

Estas tareas estaban en el Sprint 0 y se pasaron al Sprint 1 para aliviar su segunda semana. El resto de las tareas del Sprint 1 se definen en su planificación.

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S1-01 | Estándares y guía de estilo frontend | Joaquín Cardoso Díaz | S0-05 | 1 |
| S1-02 | Estándares y guía de estilo backend | Héctor Sánchez | S0-05 | 1 |
| S1-03 | AGENTS.md (SDD + reglas del equipo) | Joaquín Cardoso Díaz | S1-01, S1-02 | 2 |
| S1-04 | CLAUDE.md | Franco Martín Soler | S1-03 | 2 |
| S1-05 | Esqueletos frontend y backend | Franco Martín Soler | S0-02, S0-05, S1-01, S1-02 | 2 |
