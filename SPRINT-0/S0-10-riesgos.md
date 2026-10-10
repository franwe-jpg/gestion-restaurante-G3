# S0-10 · Análisis de riesgos y línea de corte

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Sprint 0 · Consolida las tareas S0-M1c a S0-M6c · Detalle completo en la planilla `G3_Riesgos_Sprint0.xlsx` (Drive del equipo)

## 1. Método y escala

Se usa el método de la Unidad 2: probabilidad P entre 0 y 1, impacto I de 1 a 4 y exposición E = P × I. La tabla se ordena por E descendente y, a igual E, primero el de mayor impacto.

| Impacto | Criterio en este proyecto |
| --- | --- |
| 4 · Catastrófico | No se entrega el sistema el 15/11, o se rompe un flujo central (comanda → factura → cobro) sin forma de evitarlo. |
| 3 · Crítico | Se pierde o hay que rehacer cerca de una semana de trabajo de una persona, queda sin entregar una HU obligatoria, o hay un defecto grave en una regla central (dinero, reservas). |
| 2 · Marginal | Retrabajo de hasta 2 o 3 días, o defecto en una HU con una forma manual simple de resolverlo. |
| 1 · Despreciable | Retrabajo de horas, sin efecto en la entrega. |

Criterio para P: con evidencia directa en el proyecto, 0,7 o más; sin evidencia, entre 0,4 y 0,6; si las decisiones ya tomadas (RNF, arquitectura, diagrama) lo vuelven poco probable, 0,3 o menos. Cada riesgo se escribe como «Dado que [hecho del proyecto], puede ocurrir que [consecuencia]», y el impacto se deriva de esa consecuencia.

El equipo es de 6 personas que trabajan, con plazo fijo el 15/11. Por eso los planes se diseñaron baratos (de una a dos horas) y apoyados en lo que ya existe: la daily, la CI y los PR. Los riesgos de código pesan menos porque se implementa con agentes de IA; pesan más los de tiempo, coordinación y trabajo manual.

## 2. Tabla ordenada por exposición

| # | ID | Riesgo | Cat. | P | I | E | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R01 | Baja disponibilidad de un responsable de módulo | Proyecto | 0,6 | 3 | 1,8 | Franco Martín Soler |
| 2 | R02 | Revisión superficial o tardía de los PR generados con IA | Proyecto | 0,6 | 3 | 1,8 | Héctor Sánchez |
| 3 | R03 | Sprint 1 sobrecargado de tareas manuales y documentales | Proyecto | 0,5 | 3 | 1,5 | Federico Cabaña |
| 4 | R04 | Atraso de Comanda (M4) bloquea Reservas, Pagos y reportes | Proyecto | 0,5 | 3 | 1,5 | Juan Ignacio Riquelme |
| 5 | R05 | Pruebas de integración tardías antes del 15/11 | Proyecto | 0,5 | 3 | 1,5 | Giuliano Giannoncelli |
| 6 | R06 | Supuestos propios que la cátedra no confirma | Negocio | 0,4 | 3 | 1,2 | Héctor Sánchez |
| 7 | R07 | Código y pantallas inconsistentes entre módulos | Proyecto | 0,6 | 2 | 1,2 | Joaquín Cardoso Díaz |
| | | **── LÍNEA DE CORTE ── gestión activa arriba, monitoreo abajo** | | | | | |
| 8 | R08 | Funcionalidad que la consigna no pide, agregada por el agente | Proyecto | 0,5 | 2 | 1,0 | Federico Cabaña |
| 9 | R09 | Cambio de atributos en clases compartidas después del diagrama | Proyecto | 0,5 | 2 | 1,0 | Joaquín Cardoso Díaz |
| 10 | R10 | Descuento incorrecto por promociones superpuestas | Negocio | 0,5 | 2 | 1,0 | Joaquín Cardoso Díaz |
| 11 | R11 | Mesa OCUPADA sin atención real | Negocio | 0,5 | 2 | 1,0 | Juan Ignacio Riquelme |
| 12 | R12 | Comanda reabierta después de facturada | Técnico | 0,5 | 2 | 1,0 | Juan Ignacio Riquelme |
| 13 | R13 | Doble reserva de la misma mesa | Técnico | 0,3 | 3 | 0,9 | Federico Cabaña |
| 14 | R14 | Saldo o monto de cobro incorrecto | Técnico | 0,3 | 3 | 0,9 | Héctor Sánchez |
| 15 | R15 | Cuota de IA gratuita agotada a mitad de sprint | Proyecto | 0,4 | 2 | 0,8 | Giuliano Giannoncelli |
| 16 | R16 | Entornos locales distintos entre integrantes | Técnico | 0,4 | 2 | 0,8 | Juan Ignacio Riquelme |
| 17 | R17 | Baja de producto o sección que está en uso | Negocio | 0,4 | 2 | 0,8 | Franco Martín Soler |
| 18 | R18 | Turno y franja horaria mal calculados en los reportes | Técnico | 0,4 | 2 | 0,8 | Franco Martín Soler |
| 19 | R19 | Reportes con resultados que no coinciden con los datos | Técnico | 0,4 | 2 | 0,8 | Giuliano Giannoncelli |
| 20 | R20 | Fecha de entrega del 15/11 sin confirmar | Proyecto | 0,2 | 3 | 0,6 | Joaquín Cardoso Díaz |
| 21 | R21 | Factura duplicada para la misma comanda | Técnico | 0,2 | 3 | 0,6 | Héctor Sánchez |
| 22 | R22 | Cobro con medio de pago deshabilitado o eliminado | Técnico | 0,3 | 2 | 0,6 | Héctor Sánchez |
| 23 | R23 | Fotos HEIC que no se ven en la carta | Técnico | 0,3 | 2 | 0,6 | Franco Martín Soler |

Exposición total: 23,7. Los 7 riesgos de gestión activa suman 10,5 (44 %). Hay 10 riesgos de proyecto, 9 técnicos y 4 de negocio.

## 3. Justificación de la línea de corte

1. **El tope lo pone la capacidad del equipo.** Son 6 personas que trabajan y quedan unas 5 semanas hasta el 15/11. Suponiendo 2 h para preparar cada riesgo y 0,5 h por sprint para vigilar su disparador, cada riesgo activo cuesta unas 4,5 h de equipo hasta el cierre. Con un tope de 1,5 h por persona y por semana, entran hasta 10 riesgos; con 11 ya no (1,56 h). Los valores de horas son supuestos a validar con el equipo.
2. **Se eligen 7 y no 10** porque cortar en 8, 9 o 10 partiría un grupo de cinco riesgos con E = 1,0. La línea queda entre el último valor de 1,2 y el primero de 1,0, sin partir un grupo de valores iguales. Además, cada integrante queda con uno o dos riesgos activos.
3. **Pareto no sirve como criterio principal.** Las exposiciones son parejas (de 1,8 a 0,6): los 7 activos acumulan 44 % de la exposición total y llegar al 80 % exigiría gestionar 17 riesgos, lo que supera la capacidad.
4. **Lo que queda bajo la línea no se ignora.** Todos los riesgos tienen mitigación, contingencia, disparador y responsable (planilla). Se revisan en cada review de sprint y suben a gestión activa si se activa su disparador o cambia su P o su I.

## 4. Planes de los riesgos de gestión activa

### R01 · Baja disponibilidad de un responsable de módulo

Dado que cada módulo tiene un único responsable, los seis integrantes trabajan y los sprints de implementación duran una semana, puede ocurrir que una semana de poca disponibilidad deje un módulo sin avanzar y haya que recortar HU de ese módulo antes del 15/11.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,6 · 3 · 1,8 |
| Por qué | P: el Sprint 0 ya cerró después de G0 (07/10) y no hay margen entre sprints. Impacto: perder una de las tres semanas de implementación de un módulo equivale a una semana de trabajo de una persona. |
| Mitigación | Cada responsable declara su disponibilidad en la daily de inicio de sprint (2 min). Cada módulo define de antemano su mínimo viable (ABM y flujo principal) y deja listados y reporte para el final. Las specs de las HU quedan listas en el Sprint 1 para que el agente implemente sin esperar. |
| Contingencia | Se recortan primero las HU de prioridad baja del módulo afectado y otro integrante con carga liviana toma la HU crítica con apoyo del agente. |
| Disparador | Al cierre del Sprint 2 (28/10) un módulo no tiene sus ABM en Done, o una persona avisa que no podrá dedicar el sprint. |
| Responsable | Franco Martín Soler |

### R02 · Revisión superficial o tardía de los PR generados con IA

Dado que los PR generados por agentes de IA los revisa otro integrante que también trabaja, puede ocurrir que las revisiones sean superficiales o se demoren y entren a develop defectos que aparezcan recién en las pruebas de integración del Sprint 4.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,6 · 3 · 1,8 |
| Por qué | P: seis PR por sprint de una semana y revisores con poco tiempo; el plan lo lista como riesgo propio del uso de IA. Impacto: un defecto hallado en el Sprint 4 en un flujo compartido (comanda, factura) se corrige con una semana por delante. |
| Mitigación | PR chicos (una HU por PR). La CI (lint, tests e import-linter) es condición para mergear, así la revisión humana se centra en la lógica. Checklist de 5 puntos en la plantilla de PR: criterio de aceptación probado, nada no pedido, reglas de capas, nombres y tests. Revisor rotativo. |
| Contingencia | Revisión cruzada de 1 hora por módulo al inicio del Sprint 4 sobre los PR ya integrados, priorizando Comanda, Factura y Reserva. |
| Disparador | Un PR lleva más de 24 h sin revisar, se mergea sin ningún comentario sobre la lógica, o aparece en develop un bug de un PR ya integrado. |
| Responsable | Héctor Sánchez |

### R03 · Sprint 1 sobrecargado de tareas manuales y documentales

Dado que el Sprint 1 junta en dos semanas tareas manuales y documentales (Puntos de Función con 14 factores justificados, estándares, criterios de conformidad, casos de prueba, GitFlow y CI) y el Sprint 0 terminó con atraso, puede ocurrir que el Sprint 1 pase del 21/10 y consuma parte del Sprint 2, que dura una sola semana.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,5 · 3 · 1,5 |
| Por qué | P: el Sprint 0 cerró después de G0 y el Sprint 1 tiene más tareas que el 0. Impacto: cada día de corrimiento recorta cerca de 5 % de las tres semanas de implementación. |
| Mitigación | Priorizar en el Sprint 1 lo que bloquea la implementación (estándares, AGENTS.md, esqueletos y CI). Los Puntos de Función se reparten por módulo con una plantilla única y los 14 factores se discuten una sola vez en grupo. Revisar el avance a mitad de sprint (14/10). |
| Contingencia | Pasar al Sprint 2 con lo mínimo (estándares, AGENTS.md, esqueletos, CI) y terminar PF y criterios de conformidad en paralelo durante el Sprint 2. |
| Disparador | El 14/10 menos de la mitad de las tareas del Sprint 1 está en Done, o en G1 (21/10) falta alguna de S1-02 a S1-06. |
| Responsable | Federico Cabaña |

### R04 · Atraso de Comanda (M4) bloquea Reservas, Pagos y reportes

Dado que Comanda (M4) es la base de Reservas (crear comanda con reserva), de Pagos (factura de la comanda) y de cuatro reportes, puede ocurrir que un atraso de M4 deje a M5 y M6 sin poder probar sus flujos y la integración se acumule en el Sprint 4.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,5 · 3 · 1,5 |
| Por qué | P: M4 tiene el ciclo de vida más largo (10 RF). Impacto: bloquea dos módulos y cuatro reportes. |
| Mitigación | Congelar en el Sprint 1 el contrato de Comanda y DetalleComanda (esquemas y endpoints, ya definidos en el diagrama) y dejar un stub compartido para que M5 y M6 prueben sin esperar. M4 implementa primero crear, cerrar y consultar comanda. |
| Contingencia | Otro integrante con carga liviana (M2 o M5) toma las HU secundarias de M4 (listados, modificar) para que M4 se concentre en el flujo crítico. |
| Disparador | Al cierre del Sprint 2 (28/10) Comanda no tiene funcionando crear, cerrar y consultar. |
| Responsable | Juan Ignacio Riquelme |

### R05 · Pruebas de integración tardías antes del 15/11

Dado que la entrega es el 15/11 y el Sprint 4 concentra reportes, integración entre módulos y correcciones, puede ocurrir que las pruebas de integración se dejen para el final y los defectos hallados no se alcancen a corregir en los 4 días de cierre.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,5 · 3 · 1,5 |
| Por qué | P: sin semana de colchón después del Sprint 4. Impacto: defectos en flujos centrales sin tiempo de corrección dejan HU obligatorias fallando. |
| Mitigación | Cada HU se entrega con sus pruebas en el mismo PR (RNF-MAN-04) y la CI corre la suite completa. En G2 (04/11) se corre un flujo completo reserva → comanda → factura → cobro con datos semilla; en el Sprint 4 solo se corrige. |
| Contingencia | Congelar funcionalidad nueva el 08/11 y dedicar el resto del Sprint 4 y el cierre a corregir flujos centrales; los reportes menos críticos se entregan con defectos conocidos documentados. |
| Disparador | En G2 (04/11) el flujo completo no corre de punta a punta, o la cobertura queda bajo el umbral de RNF-MAN-04. |
| Responsable | Giuliano Giannoncelli |

### R06 · Supuestos propios que la cátedra no confirma

Dado que la consigna no define varios comportamientos y el equipo los resolvió con supuestos propios, puede ocurrir que en una review o en la entrega la cátedra espere otro comportamiento y haya que cambiar flujos de uno o dos módulos sin tiempo de rehacerlos.

| | |
| --- | --- |
| Categoría | Negocio |
| P · I · E | 0,4 · 3 · 1,2 |
| Por qué | P: solo se detecta cuando un docente lo ve; G1 y G2 son la oportunidad. Impacto: cambiar reglas ya implementadas toca servicio, pruebas y pantalla, y si ocurre en el Sprint 4 no hay tiempo. |
| Mitigación | Reunir en un solo documento los supuestos marcados «Supuesto:» en HU, RNF y arquitectura, y llevarlos a G1 (21/10) para que Schanz o Urrutia los confirmen o corrijan (1 h en total). |
| Contingencia | Ajustar la regla en el servicio y su prueba de aceptación sin tocar el resto del flujo; si no hay tiempo, documentar el supuesto en el informe de cierre. |
| Disparador | Un docente observa o corrige un supuesto en G1, G2 o la entrega, o dos integrantes interpretan distinto uno de ellos. |
| Responsable | Héctor Sánchez |

### R07 · Código y pantallas inconsistentes entre módulos

Dado que cada integrante usa un agente y una herramienta distintos (OpenCode, Freebuff, Claude Code), puede ocurrir que cada módulo salga con estructura, estilo y pantallas distintas y la integración del Sprint 4 requiera rehacer código de dos o tres módulos para unificarlos.

| | |
| --- | --- |
| Categoría | Proyecto |
| P · I · E | 0,6 · 2 · 1,2 |
| Por qué | P: el plan lo reconoce como riesgo propio, los riesgos de estilo, UI e integración. Impacto: retrabajo acotado de 2 a 3 días si las reglas se verifican automáticamente. |
| Mitigación | AGENTS.md único (S1-04) con estructura, estilo y componentes de UI compartidos, y esqueletos comunes (S1-05 y S1-06). La CI verifica lint, TypeScript strict e import-linter (D-04), así la inconsistencia se detecta en el PR y no en la integración. |
| Contingencia | Unificar los componentes de UI repetidos (tablas, formularios, mensajes de error) y mover cada módulo al estilo del esqueleto. |
| Disparador | Dos módulos resuelven el mismo problema de forma distinta (formularios, manejo de errores) o el 21/10 la CI no verifica alguna regla de AGENTS.md. |
| Responsable | Joaquín Cardoso Díaz |

## 5. Riesgos bajo la línea (monitoreo)

Los planes completos de estos riesgos están en la planilla. Aquí se muestra qué los activa y quién los vigila.

| ID | Riesgo | P · I · E | Disparador | Responsable |
| --- | --- | --- | --- | --- |
| R08 | Funcionalidad que la consigna no pide, agregada por el agente | 0,5 · 2 · 1,0 | Un PR agrega endpoints, pantallas o campos que no figuran en ninguna HU ni en el diagrama. | Federico Cabaña |
| R09 | Cambio de atributos en clases compartidas después del diagrama | 0,5 · 2 · 1,0 | En el Sprint 2 o 3 hace falta agregar, quitar o renombrar un atributo de Producto, Mesa, Comanda o Cliente. | Joaquín Cardoso Díaz |
| R10 | Descuento incorrecto por promociones superpuestas | 0,5 · 2 · 1,0 | Una prueba de descuento da un importe distinto al calculado a mano, o dos promociones vigentes coinciden sobre el mismo producto. | Joaquín Cardoso Díaz |
| R11 | Mesa OCUPADA sin atención real | 0,5 · 2 · 1,0 | Al cerrar el turno hay una mesa OCUPADA sin comanda ABIERTA, o comandas abiertas hace más de 4 h. | Juan Ignacio Riquelme |
| R12 | Comanda reabierta después de facturada | 0,5 · 2 · 1,0 | La suma del detalle de una comanda facturada difiere del total de su factura. | Juan Ignacio Riquelme |
| R13 | Doble reserva de la misma mesa | 0,3 · 3 · 0,9 | La prueba de dos reservas simultáneas para igual mesa y horario crea ambas, o aparecen dos reservas ACTIVAS iguales en los datos. | Federico Cabaña |
| R14 | Saldo o monto de cobro incorrecto | 0,3 · 3 · 0,9 | Una prueba deja saldoPendiente distinto de total menos la suma de cobros, o la recaudación del reporte no coincide con la suma de cobros. | Héctor Sánchez |
| R15 | Cuota de IA gratuita agotada a mitad de sprint | 0,4 · 2 · 0,8 | Un integrante se queda sin cuota o con límite de uso y con HU del sprint sin terminar. | Giuliano Giannoncelli |
| R16 | Entornos locales distintos entre integrantes | 0,4 · 2 · 0,8 | Un PR pasa en la máquina local y falla en la CI por versión de una dependencia o por el esquema de la base. | Juan Ignacio Riquelme |
| R17 | Baja de producto o sección que está en uso | 0,4 · 2 · 0,8 | Un listado de carta, promoción o menú muestra un producto deshabilitado, o un mozo reporta que un producto activo no aparece. | Franco Martín Soler |
| R18 | Turno y franja horaria mal calculados en los reportes | 0,4 · 2 · 0,8 | En el Sprint 4 las pruebas del reporte fallan o el turno no coincide con comandas cargadas a mano. | Franco Martín Soler |
| R19 | Reportes con resultados que no coinciden con los datos | 0,4 · 2 · 0,8 | La suma del reporte difiere de la suma de los registros de origen del conjunto de datos de prueba. | Giuliano Giannoncelli |
| R20 | Fecha de entrega del 15/11 sin confirmar | 0,2 · 3 · 0,6 | La cátedra comunica una fecha anterior al 15/11, o no hay confirmación antes de G2 (04/11). | Joaquín Cardoso Díaz |
| R21 | Factura duplicada para la misma comanda | 0,2 · 3 · 0,6 | Aparecen dos facturas para la misma comanda en el listado o en los datos de prueba. | Héctor Sánchez |
| R22 | Cobro con medio de pago deshabilitado o eliminado | 0,3 · 2 · 0,6 | Un cobro queda registrado con un medio DESHABILITADO, o el reporte omite un medio eliminado. | Héctor Sánchez |
| R23 | Fotos HEIC que no se ven en la carta | 0,3 · 2 · 0,6 | En las pruebas del Sprint 2 una foto HEIC subida desde el celular no se ve en Chrome o la conversión falla. | Franco Martín Soler |

## 6. Cambios respecto de la versión anterior

La primera versión tenía 34 filas, con IDs repetidos (R32 aparecía tres veces), campos sin completar y riesgos redactados como omisiones. Se revisó fila por fila; los IDs R.. de esta sección son los de la versión anterior (la tabla completa está en la hoja «Cambios»):

- **Fusionados:** las filas que describían el mismo riesgo desde distintos módulos pasaron a uno solo (por ejemplo, estilo, UI, integración y versiones; o los tres casos de baja de productos).
- **Resueltos por el diagrama final:** R07 (el cliente se crea junto con su primera reserva) y R13 (DetalleComanda guarda el precio al pedir) dejaron de ser riesgos.
- **Descartados:** R09, R03, R32 (entrega parcial), R16 y R15, por no ser riesgos del proyecto o tener probabilidad despreciable (motivos en la planilla).
- **Nuevos:** siete riesgos que faltaban y que el plan de trabajo pide cubrir: disponibilidad del equipo, revisión de los PR generados con IA, Sprint 1 sobrecargado, supuestos sin confirmar, cuota de IA, promociones superpuestas y fecha de entrega.
- **Probabilidades:** se conservaron las estimadas por el equipo cuando eran coherentes. Se ajustaron las de R10, R18 y R26 anteriores y las de los fusionados. Las P de los riesgos nuevos fueron propuestas del agente y deben validarse con el equipo (Delphi de banda ancha).
