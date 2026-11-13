# S1-09 · Criterios de conformidad

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Federico Cabaña · Sprint 1, semana 2 · Issue #145

Un criterio de conformidad es una pregunta de sí o no que comprueba que un documento del proyecto cumple las reglas del equipo. Cada documento tiene su checklist, de 5 a 11 preguntas. Se responde marcando una sola casilla por pregunta. Un «No» indica que el documento hay que corregirlo antes de darlo por terminado.

## Estándar Base del Grupo 3

En la auditoría de verificación y conformidad de la cátedra, el informe indica el «Estándar Base»: la documentación de estándares del grupo auditado. Para el Grupo 3 es esta:

| Elemento | Documentos que forman el estándar |
| --- | --- |
| Historias de usuario | `AGENTS.md`, sección «Historias de usuario». |
| Diagrama de clases | Las reglas de la sección 2 de este documento. |
| Código Python (backend) | `SPRINT-1/S1-03-estandares-backend.md`. |
| Código TypeScript (frontend) | `SPRINT-1/S1-02-estandares-frontend.md`. |
| Plan de RSGR (riesgos) | `material-catedra/Correcciones_Riesgos_TP5_Guia_ISFPP.md` y el apunte de la unidad 2 (`material-catedra/IS3 - U2 - Apunte - Analisis y gestion del riesgo.pdf`, secciones 11 y 12). |

## 1. Historias de usuario

Fuente: `AGENTS.md`, sección «Historias de usuario». Se responde para cada HU.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿La HU sigue el formato «Como `<actor>`, quiero `<acción>` para `<beneficio>`»? | ☐ | ☐ |
| 2 | ¿Todos los criterios de aceptación tienen las tres partes «Dado que… / Cuando… / Entonces…»? | ☐ | ☐ |
| 3 | ¿Hay al menos un criterio de camino feliz? | ☐ | ☐ |
| 4 | ¿Hay al menos un criterio de error o de límite? | ☐ | ☐ |
| 5 | ¿Cada supuesto de la HU lleva la etiqueta `Supuesto:`? | ☐ | ☐ |
| 6 | ¿La HU evita inventar requerimientos que la consigna no pide? | ☐ | ☐ |

## 2. Diagrama de clases

Fuente: el issue #145. Se responde sobre el diagrama unificado.

Reglas del estándar de diseño:

1. El diagrama usa notación UML.
2. Cada clase aparece una sola vez en el diagrama unificado, aunque la usen varios módulos.
3. Toda relación indica su multiplicidad en los dos extremos.
4. Cada clase lleva la etiqueta del módulo al que pertenece (por ejemplo, M5).
5. Las multiplicidades reflejan los casos opcionales de las historias de usuario.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿El diagrama usa notación UML? | ☐ | ☐ |
| 2 | ¿Cada clase aparece una sola vez, sin duplicar las que comparten varios módulos (por ejemplo Producto, Cliente o Comanda)? | ☐ | ☐ |
| 3 | ¿Cada relación tiene multiplicidad en sus dos extremos? | ☐ | ☐ |
| 4 | ¿Cada clase indica la etiqueta del módulo al que pertenece? | ☐ | ☐ |
| 5 | ¿Las multiplicidades reflejan los casos opcionales de las HU (por ejemplo, una comanda sin reserva)? | ☐ | ☐ |

## 3. Estándares de codificación

Hay un checklist por lenguaje. Se responde sobre el código de cada PR: el 3.1 para lo que toca `backend/` y el 3.2 para lo que toca `frontend/`.

### 3.1 Python (backend)

Fuente: `SPRINT-1/S1-03-estandares-backend.md`.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿Las funciones, variables y archivos están en `snake_case`, las clases en `PascalCase` y las constantes en `MAYUSCULAS`? | ☐ | ☐ |
| 2 | ¿Los nombres de negocio están en español e iguales al diagrama de clases, las palabras técnicas en inglés y las rutas de la API en plural y en español (`/api/v1/mesas`)? | ☐ | ☐ |
| 3 | ¿Se respetan las capas: el `router` solo delega al `service`, el `service` no depende de FastAPI ni escribe consultas, y el `repository` no tiene reglas de negocio ni confirma transacciones? | ☐ | ☐ |
| 4 | ¿Un módulo solo llama al `service` de otro, nunca a su `router`, `repository`, `models` ni `schemas` (`lint-imports` pasa)? | ☐ | ☐ |
| 5 | ¿Ninguna función supera las 50 líneas ni la complejidad ciclomática 10? | ☐ | ☐ |
| 6 | ¿Todas las funciones tienen type hints en sus parámetros y en el retorno? | ☐ | ☐ |
| 7 | ¿Los datos que entran se validan con esquemas Pydantic de `schemas.py`, y la API devuelve esquemas y nunca modelos de la base? | ☐ | ☐ |
| 8 | ¿Los errores de negocio usan las excepciones de `shared/excepciones.py` y responden `{"detalle": "mensaje"}` con `404`, `409` o `422`, sin trazas, rutas ni SQL? | ☐ | ☐ |
| 9 | ¿Las consultas usan el ORM o parámetros, nunca SQL armado con texto, y el esquema cambia solo con migraciones de Alembic? | ☐ | ☐ |
| 10 | ¿El código no contiene claves, tokens ni datos secretos? | ☐ | ☐ |
| 11 | ¿Las pruebas siguen la estructura de `modules/` y el nombre `test_<función>_<caso>`, y pasan `ruff check`, `ruff format --check` y `pytest`? | ☐ | ☐ |

### 3.2 TypeScript (frontend)

Fuente: `SPRINT-1/S1-02-estandares-frontend.md`.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿Los componentes y tipos están en `PascalCase`, las variables y funciones en `camelCase`, las constantes en `MAYÚSCULAS`, y hay un componente por archivo con su mismo nombre? | ☐ | ☐ |
| 2 | ¿Los nombres de negocio están en español e iguales al diagrama de clases, sin traducciones ni sinónimos? | ☐ | ☐ |
| 3 | ¿El módulo respeta la estructura `pages/`, `components/`, `api.ts` y `types.ts`, no importa archivos de otro módulo y lo común está en `shared/`? | ☐ | ☐ |
| 4 | ¿Los componentes son funcionales con hooks (salvo `ErrorBoundary`) y tienen las props tipadas? | ☐ | ☐ |
| 5 | ¿Las llamadas a la API están solo en el `api.ts` del módulo, con el cliente de `shared/api`, sin `fetch` en los componentes y leyendo `import.meta.env` solo ahí? | ☐ | ☐ |
| 6 | ¿Ninguna función supera las 50 líneas ni la complejidad ciclomática 10? | ☐ | ☐ |
| 7 | ¿El código no usa `any` (usa `unknown` y valida), los tipos de la API están en `types.ts` y los tipos se importan con `import type`? | ☐ | ☐ |
| 8 | ¿El código no contiene claves, tokens privados ni rutas internas, y la configuración sale de variables de entorno? | ☐ | ☐ |
| 9 | ¿Pasan `npm run lint` (0 errores y 0 advertencias), `npm run format:check`, `npm run typecheck` y las pruebas? | ☐ | ☐ |

## 4. Tabla de riesgos

Hay dos checklists: el 4.1 se responde para cada riesgo y el 4.2, una sola vez, para el plan completo (el plan de RSGR).

### 4.1 Cada riesgo

Fuente: `material-catedra/Correcciones_Riesgos_TP5_Guia_ISFPP.md`, «Guía para la ISFPP: checklist por riesgo». Se responde para cada riesgo de la tabla.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿El riesgo está escrito como condición y consecuencia («Dado que `[hecho del proyecto]`, puede ocurrir que `[consecuencia concreta]`»)? | ☐ | ☐ |
| 2 | ¿Es un riesgo del proyecto y no una omisión del enunciado (no empieza con «no se menciona…» ni «no está definido…»)? | ☐ | ☐ |
| 3 | ¿Es distinto de los demás, sin solaparse con otro riesgo? | ☐ | ☐ |
| 4 | ¿La probabilidad está justificada con evidencia (si hay una afirmación explícita, es alta)? | ☐ | ☐ |
| 5 | ¿El impacto sale de la consecuencia propia del riesgo y no de una frase genérica compartida? | ☐ | ☐ |
| 6 | ¿La mitigación es proporcional al impacto? | ☐ | ☐ |
| 7 | ¿Tiene disparador y responsable? | ☐ | ☐ |

### 4.2 Conjunto de riesgos (plan de RSGR)

Fuente: preguntas 1 a 5, `material-catedra/Correcciones_Riesgos_TP5_Guia_ISFPP.md`, «Guía para el conjunto de riesgos»; preguntas 6 y 7, el apunte de la unidad 2 (secciones 11.4, 11.5 y 12). Se responde una vez sobre el informe de riesgos.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿La tabla está ordenada de mayor a menor exposición (E = P × I) y el informe muestra P, I y E de cada riesgo? | ☐ | ☐ |
| 2 | ¿La línea de corte está marcada y justificada por la capacidad del equipo (personas, dedicación y duración) y no por el presupuesto? | ☐ | ☐ |
| 3 | ¿El número de riesgos que quedan sobre la línea está explicado con un criterio (Pareto, salto natural en los valores de E, o ambos)? | ☐ | ☐ |
| 4 | ¿Los planes de reducción y de contingencia de los riesgos sobre la línea están en el informe y no solo en el anexo? | ☐ | ☐ |
| 5 | ¿El anexo solo amplía el detalle y el informe se puede leer sin él? | ☐ | ☐ |
| 6 | ¿Hay riesgos de las tres categorías (de proyecto, técnico y de negocio) y cada riesgo está en una sola? | ☐ | ☐ |
| 7 | ¿El informe y la planilla muestran los mismos valores? | ☐ | ☐ |

## 5. Gravedad de las no conformidades

El informe de auditoría de la cátedra cuenta las no conformidades críticas y las mayores, y agrega observaciones. Este grupo las clasifica así:

- **No conformidad crítica:** un «No» que expone la seguridad o los datos. Son las preguntas 3.1 n.º 9 (cuando hay SQL armado con texto), 3.1 n.º 10 y 3.2 n.º 8 (cuando lo que aparece es una clave, un token u otro dato secreto).
- **No conformidad mayor:** cualquier otro «No».
- **Observación:** comentario del auditor que no corresponde a un «No», como una mejora sugerida o un caso dudoso que no incumple el estándar.

Cada «No» se informa con su evidencia: archivo y línea, enlace al PR o resultado del comando.

## Supuestos

- `Supuesto:` la pregunta 5 de la checklist 2 se deriva de la regla de multiplicidades; no figura de forma literal en el issue.
- `Supuesto:` la pregunta 10 de la checklist 3.1 sale de RNF-SEG-04 (`SPRINT-0/S0-04-rnf.md`); S1-03 no la menciona de forma literal.
- `Supuesto:` los criterios se responden por documento. Las checklists 1 y 4.1 se aplican a cada HU y a cada riesgo; la 4.2, una sola vez al plan completo.
- `Supuesto:` la clasificación de gravedad de la sección 5 es propuesta del grupo; el documento de Auditoría de la cátedra no define qué es una no conformidad crítica ni mayor.
- `Supuesto:` las preguntas 6 y 7 de la checklist 4.2 salen del apunte de la unidad 2 y no de la guía de riesgos.
- `Supuesto:` las reglas del estándar de diseño (sección 2) resumen el texto del issue #145; no estaban escritas en un documento versionado.
