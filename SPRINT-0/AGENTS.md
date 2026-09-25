# AGENTS.md · Sprint 0 (reglas temporales)

Reglas mínimas para cualquier agente de IA que trabaje en este repositorio durante el Sprint 0 (24/09 – 07/10). Rigen hasta que exista el `AGENTS.md` de la raíz del repositorio (tarea S1-03, Sprint 1). Cuando exista, este archivo se elimina.

## Contexto

- Proyecto: ISFPP 2026, sistema de gestión de restaurante. Ingeniería de Software III, UNPSJB. Grupo 3: 6 integrantes, un módulo cada uno.
- Stack fijado por la cátedra: React, FastAPI y SQLite.
- El Sprint 0 es de planificación y diseño. **No se escribe código de la aplicación**: los esqueletos son la tarea S1-05.

## Fuentes de verdad

| Qué | Dónde |
| --- | --- |
| Alcance, módulos, tareas, dependencias y criterios del gateway G0 | `SPRINT-0/Plan-de-trabajo-Sprint.md` |
| HU, épicas y tareas (estado, responsable, criterios de aceptación) | Issues del repo, en el GitHub Project https://github.com/users/franwe-jpg/projects/2 |
| Riesgos y roadmap | Planilla `G3_Backlog_Sprint0.xlsx` del Drive del equipo (no versionada) |
| Consigna y material de la cátedra | `material-catedra/` (consigna en `propuesta-ISFPP-2026.pdf`). Los libros de Sommerville y Pressman están en el Drive del equipo |

Si dos fuentes se contradicen, el issue de GitHub gana para HU y tareas, y el plan gana para alcance y fechas. Si la contradicción es con la consigna, gana la consigna: señalarla a la persona, no resolverla por cuenta propia.

## Antes de empezar

1. Identificar quién es la persona y en qué tarea trabaja (ID `S0-xx` o `S0-Mxy`). Si no está claro, preguntar.
2. Leer el issue de esa tarea y comprobar que sus dependencias («Depende de») estén cerradas. Si no lo están, avisar antes de avanzar.
3. Trabajar solo sobre el módulo o la tarea de esa persona. No modificar artefactos de otro módulo salvo pedido explícito.

## Cómo se escriben los artefactos

### Historias de usuario

- Formato: `Como <actor>, quiero <acción> para <beneficio>.` Una HU por requerimiento funcional de la consigna, más la HU del reporte del módulo.
- Criterios de aceptación con el formato `Dado que … / Cuando … / Entonces …`: al menos uno del camino feliz y uno de error o de límite. Se escriben como checklist en el issue de la HU.
- No inventar requerimientos que la consigna no pide. Si falta información (por ejemplo, qué datos tiene un plato), proponer un supuesto marcado como `Supuesto:` para que el equipo lo valide.

### Riesgos (Unidad 2)

- Probabilidad P entre 0 y 1; impacto I de 1 (despreciable) a 4 (catastrófico); exposición E = P × I.
- Cada riesgo lleva categoría, disparador, plan de reducción y plan de contingencia, **aunque quede debajo de la línea de corte**, porque lo pide la consigna.
- La probabilidad se estima a ciegas (Delphi de banda ancha). **El agente no propone valores de P** antes de que el equipo los estime, para no anclar la estimación. Sí puede redactar riesgos, disparadores y planes.

### Diagrama de clases

- Notación UML.
- Las clases compartidas entre módulos (por ejemplo Producto, Cliente o Comanda) se unifican en la integración del diagrama (S0-09).

### Documentos

- Cada entregable del sprint va en `SPRINT-0/`, con el ID de la tarea en el nombre. Ejemplo: `SPRINT-0/S0-04-rnf.md`.
- Idioma: español neutro. Formato: Markdown.

## Git y GitHub

- Nunca trabajar ni hacer push directo sobre `main` ni `develop`.
- Una rama por tarea, creada desde `develop`: `feature/<ID>-<descripcion-corta>`. Ejemplo: `feature/S0-M4a-hu-atencion`.
- Commits con Conventional Commits: `docs: …`, `chore: …`.
- Se integra por Pull Request hacia `develop`, revisado por otro integrante. El PR menciona el issue de la tarea (`#<número>`).
- **No volver a correr `SPRINT-0/cargar_github.py`**: la carga ya se hizo, y repetirla duplica los issues.
- No crear, cerrar ni editar issues, comentarios o PR sin confirmación explícita de la persona.
- No versionar las planillas (`.xlsx`, `.ods`), los docx generados ni los libros de texto: están en `.gitignore`.

## Revisión humana

Todo lo que genera un agente es un borrador. Lo que se entrega a la cátedra es responsabilidad del equipo: una persona lo revisa y lo aprueba antes de integrarlo.
