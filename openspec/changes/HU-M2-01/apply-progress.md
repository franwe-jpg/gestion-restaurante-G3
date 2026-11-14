# Progreso de aplicación: HU-M2-01

## Estado

- Spec aprobada por el usuario para aplicar tal como está después de revisar los supuestos documentados.
- Implementación backend y frontend completa y verificada con las suites del repositorio.
- Rama: `feature/HU-M2-01-crear-menu-ejecutivo`, basada en `0bff1e0`.
- Alcance: creación y listado de menús ejecutivos; no incluye modificación/baja ni cambios en la carta pública de M1.
- Riesgo: item 1 (migración persistente).

## Registro

- 2026-10-28: creada la rama aislada y preparado OpenSpec; sin implementación de producción todavía.
- 2026-10-28: autorizado iniciar aplicación. Próximo paso: escribir pruebas RED de persistencia y alta antes de implementar.
- 2026-10-28: pruebas RED de modelo/migración añadidas, pero no ejecutables en el entorno: `pytest` no está instalado y `python3 -m pytest` devuelve `No module named pytest`. No se instaló nada ni se modificaron manifests.
- 2026-10-28: implementados modelo/relación/migración, schemas, service, repository, POST/GET y UI de alta/listado. `python3 -m compileall -q app tests alembic/versions` y `git diff --check` finalizaron correctamente; no prueban comportamiento.
- 2026-10-28: ESLint global 6.4.0 no reconoce el flat config `frontend/eslint.config.js`; las pruebas, lint y typecheck propios del proyecto no se ejecutaron.
- 2026-10-28: se reutilizó el entorno ya instalado del proyecto hermano (`isfpp_ing3/venv`, con las versiones exactas de `requirements.txt`) y los `node_modules` del checkout principal enlazados temporalmente en el worktree. No se instaló nada desde registries ni se modificaron `requirements.txt`, `package.json` ni el lockfile.
- 2026-10-28: corregidas las pruebas frontend que llamaban `setNombre`/`setPrecioFijo` inexistentes (el hook expone `actualizar`) y la prueba de obligatorios que omitía `descripcion`.
- 2026-10-28: ESLint del proyecto detectó dos reglas incumplidas en el código nuevo: `react-hooks/set-state-in-effect` en `useListaMenusEjecutivos` y complejidad 11 en `validarMenuEjecutivo`; se corrigieron sin bajar reglas.
- 2026-10-28: `MenuEjecutivoSalida` serializa `precio_fijo` con dos decimales mediante `field_serializer`, igual que `ProductoListado`, y el router lo cubre con una aserción.
- 2026-10-28: `service.py` tipa la sección recibida con un `Protocol` local (`SeccionDeCarta`) para no importar `productos.schemas`, respetando el contrato de importación entre módulos.
- 2026-10-28: las dos pruebas de downgrade posicional de M3 (`downgrade -1` y `-2`) fallaban porque la cadena ahora tiene una migración más en la cabeza. Se fijó el destino a las revisiones `f3a5c7e9b1d2` y `c4e6a8b0d2f4` (misma intención, independiente de futuras migraciones). Es un cambio solo de pruebas en `tests/modules/salon/` y requiere que el responsable de M3 lo revise.

## Verificación ejecutada

Backend (`backend/`, con el entorno del proyecto hermano):

- `ruff check .` → sin errores.
- `ruff format --check .` → 83 archivos formateados.
- `lint-imports` → 10 contratos KEPT, 0 broken.
- `pytest` → 618 pruebas pasan; cobertura 99.23 % (umbral 70 %).
- `alembic heads` → una sola cabeza: `d6b7c8e9f0a1`.

Frontend (`frontend/`, con los `node_modules` del checkout principal):

- `npm run lint` → sin errores ni advertencias.
- `npm run format:check` → todo formateado.
- `npm run typecheck` → sin errores.
- `npm run test:coverage` → 44 archivos, 444 pruebas; cobertura 74.75 % (umbral 60 %).
- `npm run build` → compila.

## Pendiente antes del PR

- Revisión y aprobación de otra persona (S1-10); en particular el ajuste de las pruebas de M3.
- Decidir con el equipo si se publica el menú ejecutivo en `/carta` de M1 (fuera del alcance de esta HU).
