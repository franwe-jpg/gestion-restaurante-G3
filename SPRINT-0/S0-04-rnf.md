# S0-04 · Requerimientos No Funcionales (RNF)

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Héctor Sánchez · Sprint 0, semana 1 · Issue #93\
Estado: **Borrador sin confirmar** (pendiente de revisión por otro integrante)

## 1. Alcance y criterios

Este documento define los RNF de rendimiento, seguridad y mantenibilidad que pide la consigna, considerando el stack fijado por la cátedra: React con TypeScript (Vite), FastAPI y SQLite.

- Cada RNF tiene un identificador, una descripción con un número o una condición concreta, y la forma de verificarlo.
- La consigna no fija cifras de carga ni de tiempo de respuesta. Todos los umbrales numéricos son **Supuestos** que el equipo debe validar antes del gateway G0 (07/10).
- Los RNF alimentan las decisiones de arquitectura de S0-05 y los criterios de conformidad y la CI del Sprint 1.
- Prioridad: **Alta** si condiciona la arquitectura o un riesgo del stack, **Media** si se verifica en la CI, **Baja** si es deseable.

### Restricciones del stack que condicionan los RNF

| Tecnología | Restricción | Efecto en los RNF |
| --- | --- | --- |
| SQLite | Un solo archivo y una sola escritura a la vez | Las escrituras se serializan: hay que acotar la duración de las transacciones y configurar el bloqueo (RNF-REN-03, RNF-REN-04). |
| SQLite | Tipado flexible y claves foráneas desactivadas por defecto | La integridad se exige desde la aplicación y la configuración (RNF-SEG-06). |
| SQLite | Sin usuarios ni permisos propios en la base | El control de acceso vive íntegramente en el backend (RNF-SEG-02). |
| FastAPI | Una API REST que concentra las reglas de negocio | La validación y la seguridad se aplican en el backend; el frontend no accede a la base (RNF-SEG-01). |
| React | Código que se ejecuta en el navegador de la persona usuaria | Nada secreto puede vivir en el frontend (RNF-SEG-04). |

## 2. Rendimiento

| ID | Descripción | Verificación | Prioridad |
| --- | --- | --- | --- |
| RNF-REN-01 | Las operaciones de lectura y listado (por ejemplo, ver carta, listar mesas, listar comandas) responden en **≤ 500 ms** en el percentil 95, con la base de datos de referencia (RNF-REN-06) y 10 usuarios concurrentes. | Prueba de carga con Locust o k6 sobre los endpoints de listado. Se registra el p95 y se compara con el umbral. | Alta |
| RNF-REN-02 | Las operaciones de escritura de un solo registro (por ejemplo, crear comanda, entregar producto, cobrar factura) responden en **≤ 800 ms** en el percentil 95, con la misma carga. | Igual que RNF-REN-01, sobre los endpoints de alta, modificación y baja. | Alta |
| RNF-REN-03 | Ninguna transacción de escritura mantiene el bloqueo de SQLite por más de **200 ms**. Las transacciones no incluyen llamadas externas ni cálculos pesados. | Registro de la duración de cada transacción (logging o middleware) durante la prueba de carga. Revisión de código en el PR. | Alta |
| RNF-REN-04 | La base se abre en modo **WAL** y con `busy_timeout` de **5 s**, de modo que una escritura concurrente espere en lugar de fallar. Con 10 usuarios concurrentes escribiendo, la tasa de errores `database is locked` es **0 %**. | Prueba de concurrencia con 10 hilos o clientes escribiendo a la vez sobre la misma tabla. Se verifica la configuración con `PRAGMA journal_mode;`. | Alta |
| RNF-REN-05 | Los reportes (mínimo 6) se generan en **≤ 3 s** para un período de hasta 12 meses sobre la base de referencia. Las consultas de reportes usan índices y agregación en la base, no en Python. | Prueba temporizada de cada reporte con la base de referencia. `EXPLAIN QUERY PLAN` sin recorridos completos de tabla en las consultas principales. | Media |
| RNF-REN-06 | Base de datos de referencia para las pruebas: **5.000 comandas, 500 productos, 50 mesas, 20 mozos, 2.000 clientes y 1.000 reservas**. *Supuesto:* representa un restaurante mediano con unos 12 meses de operación. | Script de carga de datos de prueba versionado en el repositorio. | Media |
| RNF-REN-07 | Los listados devuelven resultados **paginados** (máximo 50 registros por página por defecto y 100 como tope). Ningún endpoint de listado devuelve la tabla completa. | Prueba automatizada: pedir un listado con más de 100 registros y comprobar que la respuesta respeta el tope. | Media |
| RNF-REN-08 | La carga inicial del frontend (HTML, JS y CSS comprimidos) pesa **≤ 500 KB** y la primera pantalla es utilizable en **≤ 3 s** en una red de 10 Mbps. | `vite build` con reporte de tamaño de los bundles. Medición con Lighthouse en el build de producción. | Baja |

## 3. Seguridad

*Supuesto:* la consigna no pide autenticación ni roles como requerimiento funcional. Los RNF de este apartado se escriben para que el diseño no impida agregarlos. Si el equipo decide incluir inicio de sesión, hay que crear la HU correspondiente en el backlog (no se agrega acá por cuenta propia).

| ID | Descripción | Verificación | Prioridad |
| --- | --- | --- | --- |
| RNF-SEG-01 | Todo dato que entra por la API se valida en el backend con esquemas Pydantic (tipos, rangos, longitudes y formatos). Una entrada inválida devuelve **HTTP 422** y nunca llega a la base. El frontend no accede directamente a SQLite. | Pruebas automatizadas con entradas inválidas por endpoint (vacíos, negativos, textos largos, tipos incorrectos). Revisión de que el frontend solo llama a la API. | Alta |
| RNF-SEG-02 | El control de acceso, si existe, se aplica en el backend. Los endpoints que modifican datos quedan preparados para exigir autenticación mediante una dependencia de FastAPI, sin reescribir la lógica de negocio. | Revisión de arquitectura en S0-05. Prueba de que un endpoint protegido responde **401** sin credenciales (cuando se implemente). | Media |
| RNF-SEG-03 | Las contraseñas, si se implementa autenticación, se guardan con un hash lento con sal (**bcrypt o argon2**) y nunca en texto plano. | Revisión de código y prueba que confirme que la columna no contiene la contraseña original. | Media |
| RNF-SEG-04 | No hay secretos (claves, tokens, rutas privadas) en el repositorio ni en el código del frontend. La configuración sensible se lee de variables de entorno, y `.env` está en `.gitignore`. | Escaneo con gitleaks o detect-secrets en la CI. Revisión del build del frontend. | Alta |
| RNF-SEG-05 | Todas las consultas SQL son parametrizadas (ORM o parámetros enlazados). No se arman consultas concatenando texto de la persona usuaria. | Búsqueda en el código de consultas con concatenación o f-strings. Pruebas con entradas del tipo `' OR 1=1 --` en los campos de búsqueda. | Alta |
| RNF-SEG-06 | Las claves foráneas se activan en cada conexión (`PRAGMA foreign_keys = ON`) y las operaciones que dejarían datos huérfanos se rechazan (por ejemplo, eliminar una mesa con comandas abiertas). | Prueba automatizada que intente el borrado y compruebe el rechazo. Verificación del PRAGMA al abrir la conexión. | Alta |
| RNF-SEG-07 | CORS permite únicamente el origen del frontend configurado, sin comodín `*` en producción. | Prueba con un origen distinto, que debe ser rechazado. Revisión de la configuración. | Media |
| RNF-SEG-08 | Los datos de pago son mínimos: no se almacenan números de tarjeta completos ni códigos de seguridad. Del medio de pago solo se guarda su nombre y, si hace falta, un identificador de referencia. *Supuesto:* el sistema registra el cobro, no lo procesa. | Revisión del diagrama de clases y del esquema de la base (módulo M6). | Alta |
| RNF-SEG-09 | Los mensajes de error de la API no exponen trazas, rutas internas ni consultas SQL. Los registros (logs) no contienen datos personales de clientes ni de pago. | Prueba que provoque un error interno y revise la respuesta. Revisión de los logs generados. | Media |
| RNF-SEG-10 | Las dependencias no tienen vulnerabilidades conocidas de severidad alta o crítica. | `pip-audit` y `npm audit` en la CI, con fallo del pipeline ante hallazgos altos o críticos. | Media |
| RNF-SEG-11 | En el despliegue, la API se sirve por HTTPS. En desarrollo local se admite HTTP. | Verificación manual de la configuración de despliegue en el Sprint de despliegue. | Baja |

## 4. Mantenibilidad

| ID | Descripción | Verificación | Prioridad |
| --- | --- | --- | --- |
| RNF-MAN-01 | El backend se organiza en capas separadas (rutas, servicios con las reglas de negocio, acceso a datos y modelos). Las rutas no contienen consultas SQL y los servicios no dependen de FastAPI. Las capas y carpetas definitivas se justifican en S0-05. | Revisión de arquitectura en el PR. Prueba o regla de importaciones que impida que la capa de rutas importe el acceso a datos. | Alta |
| RNF-MAN-02 | El backend cumple la guía de estilo definida en S1-02 y pasa el linter (Flake8 o Ruff) con **0 errores**. | Linter en la CI. Un PR con errores no se integra. | Media |
| RNF-MAN-03 | El frontend cumple la guía de estilo definida en S1-01 y pasa ESLint con **0 errores**. El código compila con TypeScript en modo `strict`. | ESLint y `tsc --noEmit` en la CI. Un PR con errores no se integra. | Media |
| RNF-MAN-04 | Cobertura de pruebas automatizadas de al menos **70 %** de líneas en el backend y **60 %** en el frontend. Cada HU implementada tiene al menos una prueba que cubre su criterio de aceptación del camino feliz y una de error o de límite. *Supuesto:* los porcentajes son un punto de partida a validar. | Reporte de cobertura (pytest-cov y Jest o Vitest) en la CI, con umbral mínimo configurado. | Media |
| RNF-MAN-05 | Complejidad ciclomática máxima de **10** por función y largo máximo de **50 líneas** por función. | Regla del linter (por ejemplo, `max-complexity` de Flake8 o Ruff) en la CI. | Baja |
| RNF-MAN-06 | Los cambios en el esquema de la base se aplican mediante **migraciones versionadas** (por ejemplo, Alembic). Nadie modifica la base a mano. Se puede reconstruir una base vacía con una sola instrucción. | Prueba en la CI que cree la base desde cero con las migraciones y ejecute las pruebas. | Media |
| RNF-MAN-07 | La API queda documentada automáticamente en OpenAPI (`/docs`) y cada endpoint declara sus modelos de entrada, salida y códigos de error. | Revisión de `/docs` en cada PR. Comprobación de que no hay endpoints sin modelo de respuesta. | Baja |
| RNF-MAN-08 | Todo cambio se integra por Pull Request hacia `develop`, revisado por **al menos otro integrante**, con CI en verde, siguiendo Conventional Commits y la convención de ramas del equipo. | Reglas de protección de rama en GitHub. Revisión del historial de PR. | Media |
| RNF-MAN-09 | Los módulos son independientes entre sí: un módulo no importa las capas internas de otro, y las clases compartidas (Producto, Cliente, Comanda) viven en un único lugar definido en la integración del diagrama (S0-09). | Revisión del diagrama de clases (S0-09) y de las importaciones en el PR. | Media |
| RNF-MAN-10 | El código no repite lógica: duplicación **menor al 5 %** según el análisis estático. *Supuesto:* se mide con la herramienta de análisis que el equipo elija en el cierre. | Reporte de la herramienta de análisis estático (por ejemplo, SonarQube). | Baja |

## 5. Trazabilidad con los riesgos del stack

| Riesgo del stack | RNF que lo mitigan |
| --- | --- |
| Bloqueos de escritura en SQLite con varios usuarios | RNF-REN-03, RNF-REN-04 |
| Degradación al crecer la base de datos | RNF-REN-05, RNF-REN-06, RNF-REN-07 |
| Datos inconsistentes por integridad débil de SQLite | RNF-SEG-06, RNF-MAN-06 |
| Entradas maliciosas o mal formadas | RNF-SEG-01, RNF-SEG-05 |
| Código inconsistente entre módulos y agentes de IA distintos | RNF-MAN-01, RNF-MAN-02, RNF-MAN-03, RNF-MAN-08, RNF-MAN-09 |

## 6. Supuestos a validar por el equipo

> **Tema a charlar con el equipo.** Los umbrales numéricos de este documento no vienen de la consigna: son estimaciones iniciales del responsable. Hay que acordarlos entre los seis antes del gateway G0 (07/10) y justificar cada uno con una fuente o con el caso real.
>
> - **Caso real:** los de carga y volumen se derivan del restaurante que se modela (cantidad de mozos y cajas, comandas por día).
> - **Referencias a consultar:** límites de tiempo de respuesta de Nielsen y Core Web Vitals (rendimiento), documentación de SQLite sobre WAL y `busy_timeout`, OWASP Top 10 y ASVS (seguridad), tabla de métricas para RNF de Sommerville (en el Drive) e ISO/IEC 25010 (categorías de calidad). Las referencias están citadas de memoria y hay que confirmarlas leyendo las fuentes.
> - **Pendiente:** agregar una columna «Justificación» a las tablas de RNF una vez acordados los valores.

1. Carga esperada: **10 usuarios concurrentes** y la base de referencia de RNF-REN-06.
2. Umbrales de tiempo de respuesta (500 ms, 800 ms y 3 s).
3. Umbrales de cobertura (70 % y 60 %) y de complejidad (10).
4. La autenticación y los roles no son un requerimiento funcional de la consigna.
5. El sistema registra los cobros pero no los procesa con un tercero.
