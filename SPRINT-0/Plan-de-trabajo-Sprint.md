# Plan de trabajo · Sprint 0

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Ingeniería de Software III (4.º año) · UNPSJB, Facultad de Ingeniería, Sede Trelew\
Docentes: Sebastián Schanz y Guillermo Urrutia\
Equipo: Franco Martín Soler, Juan Ignacio Riquelme, Joaquín Cardoso Díaz, Federico Cabaña, Giuliano Giannoncelli y Héctor Sánchez\
Repositorio: `franwe-jpg/gestion-restaurante-G3` · Tablero: GitHub Project #2 · Stack fijado por la cátedra: React, FastAPI y SQLite

## 1. Objetivo del Sprint 0

El Sprint 0 (24/09 – 07/10) deja lista la base de planificación y diseño sobre la que se estima, se prueba y se implementa todo lo demás: el Product Backlog con criterios de aceptación, el análisis de riesgos con su línea de corte, el plan de desarrollo, los requerimientos no funcionales, las decisiones de arquitectura y el diagrama de clases del dominio. En este sprint no se escribe código de la aplicación.

El sprint es deliberadamente el más cargado del proyecto. La planificación y el diseño son lo que más tiempo lleva; si salen bien, la implementación con agentes de IA es rápida, porque cada agente trabaja sobre HU con criterios claros y un modelo de dominio ya acordado. Además, ahora no hay parciales, así que conviene concentrar el esfuerzo en estas dos semanas antes que estirar el diseño y comprimir la implementación.

## 2. Qué pide la cátedra y dónde se cubre

La consigna organiza los entregables en tres etapas, más una evaluación de cierre post-desarrollo, y exige al menos 6 reportes. El profesor Urrutia confirmó que en esta primera etapa se puede adelantar, además de Planificación y Gestión, parte de Arquitectura y Diseño y la definición de estándares.

| Etapa de la consigna | Entregable | Dónde se cubre |
| --- | --- | --- |
| Planificación y Gestión | Product Backlog con HU priorizadas y criterios Dado que / Cuando / Entonces | Sprint 0: S0-03 y tarea «a» de cada módulo |
| | Análisis de riesgos: matriz P × I, línea de corte justificada, plan de reducción y de contingencia para cada riesgo | Sprint 0: tarea «c» de cada módulo y S0-10 |
| | Plan de desarrollo e hitos: hoja de ruta, roles, responsabilidades, sprints y gateways | Sprint 0: S0-01 (este documento) |
| Arquitectura, Diseño y Estimación | Requerimientos no funcionales según el stack | Sprint 0: S0-04 |
| | Decisiones de arquitectura y diseño justificadas | Sprint 0: S0-05 |
| | Diagrama de clases del dominio | Sprint 0: tarea «d» de cada módulo y S0-09 |
| | Estimación por Puntos de Función (PFNA, 14 factores, PFA, LDC, esfuerzo y cotización) | Sprint 1 |
| Implementación, Pruebas y Despliegue | Estándares de codificación frontend y backend | Sprint 1: S1-02 y S1-03 |
| | Criterios de conformidad (checklists), casos de prueba automatizados, GitFlow y CI | Sprint 1 |
| | Implementación y pruebas | Sprints 2 a 4 |
| Cierre post-desarrollo | Métricas LDC vs. estimación, análisis estático de calidad y retrospectiva de riesgos | Cierre |

Para no sobrecargar el Sprint 0, los estándares de codificación, `AGENTS.md`, `CLAUDE.md` y los esqueletos pasan al Sprint 1. No se necesitan hasta que empiece la implementación y son la base de los criterios de conformidad y de la CI.

## 3. Stack y restricciones técnicas

| Capa | Tecnología | Restricción que condiciona el diseño |
| --- | --- | --- |
| Frontend | React con TypeScript (Vite) | Consume la API del backend; no accede a la base de datos. |
| Backend | Python con FastAPI | Expone una API REST y concentra las reglas de negocio. |
| Base de datos | SQLite | Un solo archivo y una sola escritura a la vez: condiciona los RNF de concurrencia y rendimiento. |

Las decisiones de arquitectura concretas (capas, estructura de carpetas y diseño de la API) se toman y justifican en S0-05 a partir de los RNF de S0-04. Los esqueletos que corren vacíos se arman en S1-05 (backend) y S1-06 (frontend).

## 4. Marco de trabajo

Aplicamos Scrum sin Product Owner. El equipo completo cumple el rol de Scrum Master y toma las decisiones de producto a partir de la consigna. Las responsabilidades se asignan por módulo y por tarea (secciones 6 y 7).

| Evento | Cuándo | Cómo |
| --- | --- | --- |
| Daily meeting (S0-12) | Al inicio de cada clase | Unos 10 minutos: qué hice, qué voy a hacer y qué me bloquea. |
| Review y gateway (S0-11) | Al cierre de cada sprint (G0: 07/10) | Cada uno muestra su trabajo y se hace una revisión cruzada entre módulos. |

El trabajo es educativo, así que no hay cliente real. Aun así, como lo pide la consigna, la estimación por Puntos de Función del Sprint 1 incluye una cotización. Las etapas de análisis y diseño se trabajan en sprints de 2 semanas y la implementación en sprints de 1 semana. La entrega final se fija el 15/11/2026, a confirmar con la cátedra.

## 5. Desarrollo asistido por IA

### Enfoque: Spec Driven Development

El equipo trabaja con Spec Driven Development (SDD) asistido por agentes de IA: primero se especifica y después se genera el código. El agente no decide qué construir; implementa lo que ya está especificado y revisado por una persona.

| Paso | Qué se produce | Quién decide |
| --- | --- | --- |
| 1. Especificar | HU con criterios de aceptación, modelo de dominio y RNF (Sprint 0) | El responsable del módulo |
| 2. Detallar | Spec de la HU: contrato de la API, datos y casos de prueba (formato definido en S1-04) | El responsable del módulo, con apoyo del agente |
| 3. Implementar | Código y tests generados a partir de la spec | El agente, dentro de las reglas de `AGENTS.md` |
| 4. Verificar | Tests en verde, lint y CI sin errores | La CI (Sprint 1) |
| 5. Revisar e integrar | Pull Request hacia `develop` revisado por otro integrante | Una persona, siempre |

### Herramientas y reglas

- Cada integrante usa un agente que lea el repositorio, integrado en el editor o en la terminal: OpenCode (gratuito), Freebuff o Claude Code, entre otros.
- Como no todos usamos la misma herramienta, las reglas viven en un único `AGENTS.md`, que la mayoría de los agentes reconoce. `CLAUDE.md` solo remite a `AGENTS.md` y agrega lo específico de Claude Code.
- Durante el Sprint 0 rigieron reglas temporales para los agentes. En S1-04 se reemplazaron por el `AGENTS.md` definitivo, en la raíz del repositorio, que incluye los estándares, el formato de las specs y la estructura de carpetas.
- Todo lo que genera un agente es un borrador. Lo que se entrega a la cátedra es responsabilidad del equipo: una persona lo revisa y lo aprueba antes de integrarlo.

### Uso de IA en este sprint

- **Product Backlog (S0-03).** Claude Code generó las 64 HU a partir de la consigna, con 2 criterios mínimos cada una, marcados como «Borrador sin confirmar». Cada responsable los revisa en la tarea «a» de su módulo.
- **Riesgos.** El agente puede redactar riesgos, disparadores y planes, pero no propone probabilidades. La probabilidad se estima a ciegas (Delphi de banda ancha) para evitar el anclaje, y una sugerencia del agente sería justamente un ancla.
- **Diagrama y documentos.** El agente puede proponer clases y redactar documentos, siempre marcando los supuestos (`Supuesto:`) que la consigna no define.

### Riesgos propios del uso de IA

Estos riesgos tienen que evaluarse en la tabla de riesgos junto con los de cada módulo:

- Requerimientos inventados por el agente que la consigna no pide.
- Código inconsistente entre módulos por usar agentes y herramientas distintas.
- Revisión humana superficial de lo generado.
- Dependencia de una herramienta o de su cuota de uso gratuita.

## 6. Módulos y responsables

Los requerimientos funcionales de la consigna se agrupan en 6 módulos, uno por integrante. Cada uno es dueño de su módulo durante todo el proyecto y hace la tarea que corresponde a cada etapa: HU, riesgos y diagrama en el Sprint 0, Puntos de Función en el Sprint 1, e implementación y pruebas después. Se eligió este reparto porque el equipo trabaja de forma bastante independiente entre clases.

| Módulo | Responsable | Alcance | Reporte propuesto |
| --- | --- | --- | --- |
| M1 Productos y Carta | Franco Martín Soler | Platos, postres, bebidas y secciones de la carta (14 RF) | Productos más vendidos por período |
| M2 Menús y Promociones | Joaquín Cardoso Díaz | Menú ejecutivo, menú del día y promociones (9 RF) | Ventas de menús y promociones por período |
| M3 Salón y Mozos | Giuliano Giannoncelli | Mesas, sectores y mozos (12 RF) | Mesas atendidas y ventas por mozo |
| M4 Atención al Público | Juan Ignacio Riquelme | Clientes y ciclo de la comanda (10 RF) | Comandas y ticket promedio por día/turno |
| M5 Reservas | Federico Cabaña | Reservas, cancelaciones y comanda con reserva (6 RF) | Reservas y ausentismo por período |
| M6 Pagos | Héctor Sánchez | Facturas, cobros, comprobantes y medios de pago (7 RF) | Recaudación por medio de pago y deuda pendiente |

Los 58 requerimientos funcionales más los 6 reportes dan las 64 HU del Product Backlog. Un reporte es una funcionalidad del módulo (por ejemplo, los productos más vendidos del mes): en el Sprint 0 solo se define qué muestra, y se programa en el Sprint 4, cuando ya existen los datos que resume. Además, cada reporte cuenta como salida externa en la estimación por Puntos de Función.

## 7. Backlog del Sprint 0 (24/09 – 07/10)

La semana 1 va del 24/09 al 30/09 y la semana 2, del 01/10 al 07/10. La columna «Depende de» indica qué tarea tiene que estar terminada antes de empezar. Cada tarjeta del Project detalla qué hay que hacer y cuándo se considera terminada.

### Tareas de cada módulo

Cada responsable hace las cuatro tareas de su módulo. Por ejemplo, las de Juan (M4) son S0-M4a, S0-M4b, S0-M4c y S0-M4d.

| Tarea | Qué se entrega | Depende de | Semana |
| --- | --- | --- | --- |
| a · Revisar las HU | Criterios de aceptación corregidos y completos, prioridad revisada y sin el aviso de borrador | S0-03 | 1 |
| b · Definir el reporte | La HU del reporte con los datos que muestra, sus filtros y sus cálculos | a | 2 |
| c · Riesgos del módulo | Filas en la tabla de riesgos con P, I, E, disparador, plan de reducción y plan de contingencia | a | 2 |
| d · Diagrama de clases del módulo | Clases, atributos y relaciones del módulo en UML | a | 2 |

Conviene terminar las tareas b, c y d antes del 04/10, para que haya tiempo de integrarlas.

### Tareas generales del proyecto

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S0-01 | Plan de desarrollo e hitos | Franco Martín Soler | — | 1 |
| S0-02 | Crear repositorios y tablero Project | Franco Martín Soler | — | 1 |
| S0-03 | Generar Product Backlog base con Claude Code | Franco Martín Soler | S0-02 | 1 |
| S0-04 | Requerimientos No Funcionales (RNF) | Héctor Sánchez | — | 1 |
| S0-05 | Decisiones de arquitectura y diseño | Héctor Sánchez | S0-04 | 1 |
| S0-09 | Integración del diagrama de clases | Todo el equipo | S0-M1d, S0-M2d, S0-M3d, S0-M4d, S0-M5d, S0-M6d | 2 |
| S0-10 | Acomodar la tabla de riesgos y definir la línea de corte | Juan Ignacio Riquelme | S0-M1c, S0-M2c, S0-M3c, S0-M4c, S0-M5c, S0-M6c | 2 |
| S0-11 | Review del Sprint 0 y gateway G0 (07/10) | Todo el equipo | S0-01, S0-04, S0-05, S0-09, S0-10 | 2 |
| S0-12 | Daily meeting en cada clase | Todo el equipo | — | 1 y 2 |

Los IDs S0-06, S0-07 y S0-08 no se usan: eran tareas que se descartaron.

### Camino crítico

El backlog base (S0-02 y S0-03) ya está hecho, así que cada módulo puede empezar a revisar sus HU desde el primer día. En paralelo avanzan el plan (S0-01) y los RNF (S0-04), que alimentan las decisiones de arquitectura (S0-05). En la segunda semana, las tareas de cada módulo se integran en dos consolidaciones: el diagrama único (S0-09) y la tabla de riesgos con la línea de corte (S0-10). Todo converge en la review y el gateway G0 (S0-11).

### Criterios para aprobar el gateway G0

- [ ] Product Backlog priorizado y con criterios de aceptación revisados por cada módulo.
- [ ] Tabla de riesgos ordenada por exposición, con la línea de corte justificada y un plan de reducción y otro de contingencia para cada riesgo.
- [ ] Plan de desarrollo con roles, responsabilidades, hitos, sprints y gateways.
- [ ] RNF y decisiones de arquitectura documentados.
- [ ] Diagrama de clases integrado, sin clases duplicadas.

## 8. Análisis de riesgos

Se usa el método de la Unidad 2:

- Probabilidad P entre 0 y 1, impacto I de 1 (despreciable) a 4 (catastrófico) y exposición E = P × I.
- La probabilidad se estima a ciegas (Delphi de banda ancha): cada uno estima sin ver las estimaciones de los demás, para evitar el anclaje.
- La línea de corte se traza donde se acaba la capacidad del equipo de gestionar riesgos activamente, y se justifica.
- Cada riesgo lleva categoría, disparador, plan de reducción y plan de contingencia, aunque quede debajo de la línea de corte.

Cada integrante cargó los riesgos de su módulo y después se consolidaron en la planilla `G3_Riesgos.xlsx`, en la raíz del repositorio (informe en `SPRINT-0/S0-10-riesgos.md`). Además de los de cada módulo, la tabla tiene que incluir los riesgos generales del proyecto (plazo, equipo y uso de IA, sección 5). El más evidente es el plazo: tres sprints de una semana para implementar 64 HU.

## 9. Organización en GitHub

### Ramas y Pull Requests

| Rama | Uso |
| --- | --- |
| `main` | Solo recibe lo que se cierra en cada gateway. Nadie trabaja ni hace push directo. |
| `develop` | Integración del trabajo del sprint. Nadie trabaja ni hace push directo. |
| `feature/<ID>-<descripcion>` | Una rama por tarea, creada desde `develop`. Ejemplo: `feature/S0-M4a-hu-atencion`. |

- Cuando una o varias tarjetas están terminadas (lo decide cada uno), se abre un Pull Request de la rama hacia `develop`. Otro integrante lo revisa antes del merge.
- Los commits siguen Conventional Commits (`docs: …`, `feat: …`, `fix: …`) y el PR menciona el issue de la tarea (`#<número>`).
- En el Sprint 1 se completa el diseño de GitFlow y se configura una CI con GitHub Actions que corre lint y tests en cada push y en cada PR, para validar que nada se rompa antes de integrar.

### Tablero (GitHub Project #2)

- **Vistas:** «Sprint Backlog» muestra las tareas del sprint en curso y «Product Backlog» muestra las épicas y las HU.
- **Estados:** Backlog → Sprint Backlog → In Progress → Done → En main. Cada uno mueve sus tarjetas: a «In Progress» al empezar y a «Done» al terminar.
- **Campo «Sprint»:** Sprint 0 a Sprint 4 y Cierre, con sus fechas.
- **Labels:** tipo (`épica`, `historia`, `tarea`), sprint (`sprint-0`, `sprint-1`), `transversal` y uno por módulo.

### Identificadores y trazabilidad

| ID | Qué identifica | Ejemplo |
| --- | --- | --- |
| `HU-Mx-nn` | Historia de usuario del módulo x | HU-M1-01 Crear un plato |
| `S0-nn` | Tarea general del Sprint 0 | S0-04 RNF |
| `S0-Mxy` | Tarea y del módulo x en el Sprint 0 | S0-M4a Revisar las HU de M4 |
| `S1-nn` | Tarea del Sprint 1 | S1-02 Estándares frontend |

El ID de la tarea aparece en el nombre de la rama y en el PR, así cada cambio se puede rastrear hasta su tarjeta y su HU.

### Fuentes de verdad

| Qué | Dónde |
| --- | --- |
| HU, tareas, responsables y estado | Issues del GitHub Project. Desde la carga inicial se editan ahí y no en la planilla. |
| Riesgos | Planilla `G3_Riesgos.xlsx`, en la raíz del repositorio, e informe `SPRINT-0/S0-10-riesgos.md`. |
| Roadmap y tareas de cada sprint | Planilla `G3_Backlog.xlsx`, en la raíz del repositorio (una hoja por sprint). |
| Alcance, fechas y reglas del sprint | Este plan y `AGENTS.md`, en la raíz del repositorio. |

El script `SPRINT-0/cargar_github.py` hizo la carga inicial de issues y no se vuelve a correr, porque duplica los issues.

## 10. Roadmap

| Sprint | Fechas | Alcance | Gateway |
| --- | --- | --- | --- |
| Sprint 0 | 24/09 – 07/10 (2 semanas) | Planificación y Gestión, RNF, arquitectura y diagrama de clases | G0 · 07/10 |
| Sprint 1 | 08/10 – 21/10 (2 semanas) | Estimación por PF (PFNA, 14 factores, LDC, esfuerzo y cotización), estándares de codificación, `AGENTS.md` y `CLAUDE.md`, esqueletos, criterios de conformidad, diseño de pruebas, GitFlow y CI | G1 · 21/10 |
| Sprint 2 | 22/10 – 28/10 (1 semana) | Implementación: entidades base y ABM de cada módulo, con tests | — |
| Sprint 3 | 31/10 – 06/11 (1 semana) | Implementación: flujos (comanda, reserva, facturación, promociones) | G2 · 06/11 |
| Sprint 4 | 07/11 – 13/11 (1 semana) | Implementación: reportes, integración entre módulos y correcciones | — |
| Cierre | 14/11 – 15/11 (2 días) | Métricas LDC vs. estimación, análisis estático, retrospectiva de riesgos y entrega | Entrega · 15/11 (a confirmar) |

El Sprint 2 se subestimó y terminó un día después de lo previsto. Eso dejó poco tiempo para completar sus cards, así que el 30/10 se usó para terminarlas y el Sprint 3 empieza el 31/10. El Sprint 3 y el Sprint 4 se corren dos días, y el Cierre pasa de 4 a 2 días para que la entrega siga siendo el 15/11. El equipo aceptó achicar el Cierre.

En todas las etapas se mantiene la división por módulos: en el Sprint 1 cada uno cuenta los Puntos de Función de su módulo, y en la implementación cada uno construye y prueba el suyo.

### Tareas del Sprint 1

Las 16 tareas del Sprint 1 están cargadas en el tablero y en la hoja «Sprint 1» de `G3_Backlog.xlsx`. Una tarea depende de otra solo cuando no se puede hacer sin que la otra esté terminada.

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S1-01 | Instalar OpenCode y Gentle AI | Todo el equipo | — | 1 |
| S1-02 | Estándares y guía de estilo frontend | Joaquín Cardoso Díaz | S1-01 | 1 |
| S1-03 | Estándares y guía de estilo backend | Héctor Sánchez | S1-01 | 1 |
| S1-04 | AGENTS.md y CLAUDE.md (SDD con OpenCode y Claude Code) | Franco Martín Soler | S1-02, S1-03 | 2 |
| S1-05 | Esqueleto del backend | Héctor Sánchez | S1-01 | 2 |
| S1-06 | Esqueleto del frontend | Joaquín Cardoso Díaz | S1-01 | 2 |
| S1-07 | Diseño de pruebas: escribir los casos de prueba | Giuliano Giannoncelli | — | 1 y 2 |
| S1-M1 a S1-M6 | Contar los Puntos de Función del módulo | El dueño de cada módulo | — | 1 |
| S1-08 | Estimación de Puntos de Función del proyecto | Juan Ignacio Riquelme | S1-M1 a S1-M6 | 2 |
| S1-09 | Criterios de conformidad | Federico Cabaña | S1-02, S1-03 | 2 |
| S1-10 | GitFlow y CI | Franco Martín Soler | S1-05, S1-06 | 2 |

### Tareas del Sprint 2

Las 9 tareas del Sprint 2 (22/10 – 28/10) están en la hoja «Sprint 2» de `G3_Backlog.xlsx`. Es el primer sprint de implementación: cada módulo construye sus entidades base y su ABM, con pruebas. Las HU de cada módulo y los tiempos son un supuesto que valida cada responsable en la daily.

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S2-01 | Congelar el contrato de Comanda | Juan Ignacio Riquelme | — | 1 |
| S2-02 | Confirmar con los docentes los supuestos y la fecha de entrega | Franco Martín Soler | — | 1 |
| S2-03 | Review del Sprint 2 y revisión de riesgos (28/10) | Todo el equipo | S2-M1 a S2-M6 | 1 |
| S2-M1 | Entidades base y ABM de productos y carta | Franco Martín Soler | — | 1 |
| S2-M2 | Entidades base y ABM de menús | Joaquín Cardoso Díaz | S2-M1 | 1 |
| S2-M3 | Entidades base y ABM del salón | Giuliano Giannoncelli | — | 1 |
| S2-M4 | Entidades base y comanda | Juan Ignacio Riquelme | S2-01, S2-M1, S2-M3 | 1 |
| S2-M5 | Entidad base y ABM de reservas | Federico Cabaña | S2-M3, S2-M4 | 1 |
| S2-M6 | Entidades base y ABM de medios de pago | Héctor Sánchez | — | 1 |

Reparto de las HU (44 en total). Las promociones, las cancelaciones, la factura y el cobro, y el resto de la comanda son flujos y quedan para el Sprint 3; los reportes, para el Sprint 4.

| Módulo | HU del Sprint 2 | Cantidad |
| --- | --- | --- |
| M1 Productos y Carta | HU-M1-01 a HU-M1-13 | 13 |
| M2 Menús y Promociones | HU-M2-01 a HU-M2-06 | 6 |
| M3 Salón y Mozos | HU-M3-01 a HU-M3-12 | 12 |
| M4 Atención al Público | HU-M4-01 a HU-M4-03, HU-M4-04, HU-M4-07, HU-M4-09 | 6 |
| M5 Reservas | HU-M5-01 a HU-M5-03 | 3 |
| M6 Pagos | HU-M6-04 a HU-M6-07 | 4 |

### Camino crítico del Sprint 2

Las dependencias salen de los datos de las HU: un Menú se arma con productos y una sección de la carta (M1), una Comanda se crea sobre una Mesa (M3) y una Reserva necesita un Cliente (M4) y una Mesa (M3). Por eso M1 y M3 son la base del sprint y deben dejar primero la sección y el producto (HU-M1-10, HU-M1-01, 04 y 07) y el sector y la mesa (HU-M3-01 y HU-M3-05). M4 deja el contrato de Comanda (S2-01) y el cliente (HU-M4-01), y M5 y M6 usan el stub hasta que Comanda esté lista. M1 y M3 tienen más HU que el resto (13 y 12), así que M5 y M6 revisan primero sus pull requests (riesgo R02). Si el 26/10 un módulo viene atrasado, se prioriza Crear y Listar sobre Modificar y Dar de baja (riesgo R01).

### Criterios de cierre del Sprint 2 (28/10, sin gateway)

- [ ] El ABM de cada módulo está en `develop`, con sus pruebas y la CI en verde. Como mínimo, crear y listar.
- [ ] Comanda permite crear, listar y cerrar, y su contrato está publicado (riesgo R04).
- [ ] Los supuestos y la fecha de entrega están confirmados con los docentes, o está anotado qué falta (riesgos R06 y R20).
- [ ] Informe del Sprint 2 con burndown.

### Tareas del Sprint 3

Las 7 tareas del Sprint 3 (31/10 – 06/11) están en la hoja «Sprint 3» de `G3_Backlog.xlsx`. Es el sprint de los flujos: el ciclo de la comanda, las cancelaciones y la comanda desde una reserva, la factura, el cobro y el comprobante, y las promociones. También se terminan las HU que quedaron pendientes del Sprint 2: el cliente (M4), el ABM de reservas (M5) y los medios de pago (M6). El sprint cierra con el gateway G2 el 06/11.

| ID | Tarea | Responsable | Depende de | Semana |
| --- | --- | --- | --- | --- |
| S3-01 | Plan y mensaje del Sprint 3 | Franco Martín Soler | — | 1 |
| S3-M1 | Crear, marcar como entregado y cerrar la comanda | Franco Martín Soler | S3-M4 (cliente) | 1 |
| S3-M2 | Promociones | Joaquín Cardoso Díaz | — | 1 |
| S3-M3 | Modificar y reabrir la comanda, y cobrar una factura adeudada | Giuliano Giannoncelli | S3-M1 (crear y cerrar comanda), S3-M6 (factura) | 1 |
| S3-M4 | Cliente, listar y eliminar comandas | Juan Ignacio Riquelme | S3-M1 (crear comanda) | 1 |
| S3-M5 | ABM de reservas, cancelaciones y comanda desde una reserva | Federico Cabaña | S3-M4 (cliente), S3-M1 (crear comanda) | 1 |
| S3-M6 | Medios de pago, factura y comprobante | Héctor Sánchez | S3-M1 (cerrar comanda), S3-M3 (cobro) | 1 |

Las dependencias son entre HU, no entre cards completas: por eso S3-M1 y S3-M4, o S3-M3 y S3-M6, dependen una de otra sin bloquearse. Cada card dice qué HU espera a cuál.

Reparto de las HU (26 en total). Los reportes (HU-M1-15, HU-M2-10, HU-M3-13, HU-M4-11, HU-M5-07 y HU-M6-08) quedan para el Sprint 4.

| Responsable | HU del Sprint 3 | Cantidad |
| --- | --- | --- |
| Franco Martín Soler | HU-M4-04, HU-M4-08 y HU-M4-09 (reasignadas de M4) | 3 |
| Joaquín Cardoso Díaz | HU-M2-07 a HU-M2-09 | 3 |
| Giuliano Giannoncelli | HU-M4-05 y HU-M4-10 (reasignadas de M4) y HU-M6-02 (reasignada de M6) | 3 |
| Juan Ignacio Riquelme | HU-M4-01 a HU-M4-03 (pendientes del Sprint 2), HU-M4-06 y HU-M4-07 | 5 |
| Federico Cabaña | HU-M5-01 a HU-M5-03 (pendientes del Sprint 2) y HU-M5-04 a HU-M5-06 | 6 |
| Héctor Sánchez | HU-M6-04 a HU-M6-07 (pendientes del Sprint 2), HU-M6-01 y HU-M6-03 | 6 |

**Decisión del equipo: reasignar HU fuera de su módulo.** Al cierre del Sprint 2, M1 y M3 tienen su ABM terminado, y M4, M5 y M6 tienen HU pendientes. Para que nadie espere a otro, Franco (M1) y Giuliano (M3) toman el camino crítico de la comanda, y Juan (M4) y Federico (M5) quedan con la carga más liviana y al final de la cadena de dependencias. Se reasignan 6 HU: cinco de M4 (HU-M4-04, 08 y 09 a Franco; HU-M4-05 y 10 a Giuliano) y una de M6 (HU-M6-02 a Giuliano).

- La regla «no tocar módulos ajenos» (`AGENTS.md`, regla 9.3) se respeta por acuerdo con el responsable del módulo. `Supuesto:` la reasignación necesita el acuerdo de Juan (M4) y de Héctor (M6); si alguno no está de acuerdo, se avisa en la daily y se vuelve a repartir.
- `Supuesto:` el responsable del módulo revisa la spec y el pull request de cada HU reasignada, para que el módulo siga siendo coherente.
- Las métricas LDC del Cierre registran quién implementó cada HU, para no atribuir al responsable del módulo un esfuerzo que hizo otro integrante.

### Camino crítico del Sprint 3

1. **Día 1 (31/10), sin bloqueos.** Juan integra el cliente (PR #196) en `develop`; con eso, Federico actualiza su rama con `develop` y abre el pull request del ABM de reservas. Antes, Federico cambia el `down_revision` de su migración `f1e2d3c4b5a6_crea_reservas` de `d6b7c8e9f0a1` a `0e9f2fe2e157`, que es la cabeza actual de Alembic en `develop`. En paralelo, Franco empieza crear comanda, Héctor los medios de pago, Joaquín las promociones y Giuliano escribe sus specs.
2. **Crear comanda (HU-M4-04, Franco)** destraba listar y eliminar comandas (Juan), modificar la comanda (Giuliano) y la comanda desde una reserva (Federico).
3. **Marcar como entregado y cerrar (HU-M4-08 y HU-M4-09, Franco)** destraban la factura (Héctor) y reabrir la comanda (Giuliano). Marcar como entregado va antes que cerrar porque el contrato de Comanda (supuesto A02 de `openspec/changes/S2-01-contrato-comanda/`) no deja cerrar una comanda con productos sin entregar.
4. **Factura (HU-M6-01, Héctor) → cobro (HU-M6-02, Giuliano) → comprobante (HU-M6-03, Héctor).**

Las promociones (M2) no bloquean a nadie: la comanda funciona sin ellas. Mientras una HU espera algo de otro, se escribe su spec y sus pruebas, y se sigue con esa HU solo cuando lo que falta está en `develop`. Si una dependencia se demora, se avisa a su responsable y en la daily.

### Criterios de cierre del Sprint 3 (06/11, gateway G2)

- [ ] Comanda permite crear, marcar un producto como entregado, cerrar y listar, en `develop` con sus pruebas.
- [ ] Reserva tiene su ABM, las cancelaciones (anticipada y por ausencia) y la comanda a partir de una reserva, en `develop`.
- [ ] Pagos tiene los medios de pago, la factura, el cobro y el comprobante, en `develop`.
- [ ] Las promociones están en `develop`.
- [ ] La CI está en verde y la cobertura cumple RNF-MAN-04 (70 % en el backend y 60 % en el frontend).
- [ ] Está registrado quién implementó cada HU reasignada, para las métricas LDC del Cierre.
- [ ] Informe del Sprint 3 con burndown.
