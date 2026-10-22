# S1-09 · Criterios de conformidad

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Federico Cabaña · Sprint 1, semana 2 · Issue #145

Un criterio de conformidad es una pregunta de sí o no que comprueba que un documento del proyecto cumple las reglas del equipo. Cada documento tiene su checklist, de 5 a 8 preguntas. Se responde marcando una sola casilla por pregunta. Un «No» indica que el documento hay que corregirlo antes de darlo por terminado.

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

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿El diagrama usa notación UML? | ☐ | ☐ |
| 2 | ¿Cada clase aparece una sola vez, sin duplicar las que comparten varios módulos (por ejemplo Producto, Cliente o Comanda)? | ☐ | ☐ |
| 3 | ¿Cada relación tiene multiplicidad en sus dos extremos? | ☐ | ☐ |
| 4 | ¿Cada clase indica la etiqueta del módulo al que pertenece? | ☐ | ☐ |
| 5 | ¿Las multiplicidades reflejan los casos opcionales de las HU (por ejemplo, una comanda sin reserva)? | ☐ | ☐ |

## 3. Estándares de codificación

Fuentes: `SPRINT-1/S1-03-estandares-backend.md` (backend) y `SPRINT-1/S1-02-estandares-frontend.md` (frontend). Se responde sobre el código de cada PR.

| # | Pregunta | Sí | No |
| --- | --- | --- | --- |
| 1 | ¿Los nombres siguen la convención del lenguaje (backend: `snake_case` y `PascalCase`; frontend: `camelCase` y `PascalCase`)? | ☐ | ☐ |
| 2 | ¿Los nombres de negocio están en español y son iguales a los del diagrama de clases? | ☐ | ☐ |
| 3 | ¿Se respeta la separación de capas (backend: el `router` solo delega al `service`; frontend: las llamadas a la API están solo en `api.ts`)? | ☐ | ☐ |
| 4 | ¿Cada módulo evita usar las partes internas de otro (backend: solo llama a su `service`; frontend: no importa sus archivos internos)? | ☐ | ☐ |
| 5 | ¿Ninguna función supera las 50 líneas ni la complejidad ciclomática 10? | ☐ | ☐ |
| 6 | ¿Todo está tipado (backend: type hints en todas las funciones; frontend: sin `any`)? | ☐ | ☐ |
| 7 | ¿El código no contiene claves ni datos secretos, ni SQL armado con texto? | ☐ | ☐ |
| 8 | ¿El lint, el formato y las pruebas pasan sin errores (Ruff y pytest en backend; ESLint, Prettier, `typecheck` y pruebas en frontend)? | ☐ | ☐ |

## 4. Tabla de riesgos

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

## Supuestos

- `Supuesto:` la pregunta 5 de la checklist 2 se deriva de la regla de multiplicidades; no figura de forma literal en el issue.
- `Supuesto:` los criterios se responden por documento. Las checklists 1 y 4 se aplican a cada HU y a cada riesgo.
