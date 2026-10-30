# Frontend · Sistema de Gestión de Restaurante

Aplicación React con TypeScript, Vite, Tailwind CSS y componentes reutilizables al estilo shadcn/ui. La estructura está definida en `SPRINT-0/S0-05-arquitectura.md` (secciones 2.1 y 4.1). Los estándares de estilo están en `SPRINT-1/S1-02-estandares-frontend.md`.

Todos los comandos se ejecutan desde la carpeta `frontend/`. Requiere Node.js 22.12 o más nuevo.

## Instalar

```bash
npm install
cp .env.example .env
```

El `.env` real no se sube al repositorio (RNF-SEG-04).

## Levantar

```bash
npm run dev
```

Abrir http://localhost:5173. La pantalla de inicio no consulta el backend, así que el frontend se puede usar sin la API levantada.

El estado del backend está en http://localhost:5173/salud: muestra `Estado del servicio: ok` cuando la API responde, o un aviso si no está disponible. La URL de la API se toma de `VITE_API_URL`.

Para ver el estado `ok` tiene que estar corriendo el backend (`GET /api/v1/salud`). Si todavía no está integrado en `develop`, levantarlo desde la rama `feature/S1-05-esqueleto-backend`.

## Rutas

| Ruta           | Pantalla                                                                         |
| -------------- | -------------------------------------------------------------------------------- |
| `/`            | Panel de inicio con acceso a los módulos                                         |
| `/productos`   | M1 · Productos y Carta (placeholder)                                             |
| `/menus`       | M2 · Menús y Promociones (placeholder)                                           |
| `/salon`       | M3 · Salón y Mozos (placeholder)                                                 |
| `/atencion`    | M4 · Atención al Público (placeholder)                                           |
| `/reservas`    | M5 · Reservas (placeholder)                                                      |
| `/pagos`       | M6 · Pagos (placeholder)                                                         |
| `/componentes` | Guía visual completa: formularios, feedback, tablas, reportes, overlays y layout |
| `/salud`       | Estado del backend                                                               |
| `/403`         | Acceso denegado                                                                  |
| `/500`         | Error interno del servidor                                                       |
| `/503`         | Servicio no disponible                                                           |

## Lint y formato

```bash
npm run lint
npm run format:check
```

Para corregir automáticamente: `npm run format`.

## Pruebas y cobertura

```bash
npm test
npm run test:coverage
```

La cobertura mínima es 60 % (RNF-MAN-04). Mientras los módulos estén vacíos, la cobertura se mide sobre `src/App.tsx` y `src/shared/`; desde el Sprint 2 se incorporan los módulos con su lógica.

## Compilar

```bash
npm run build
```

El bundle de producción se mantiene por debajo de 500 KB gzip (RNF-REN-08).

## Configuración

| Variable       | Para qué sirve             | Valor por defecto       |
| -------------- | -------------------------- | ----------------------- |
| `VITE_API_URL` | Origen del backend FastAPI | `http://127.0.0.1:8000` |

## Estructura

```text
frontend/
├── src/
│   ├── main.tsx             # punto de entrada
│   ├── App.tsx              # rutas principales
│   ├── index.css            # Tailwind y tipografías
│   ├── modules/             # un directorio por módulo
│   │   └── <modulo>/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── api.ts
│   │       └── types.ts
│   └── shared/
│       ├── api/             # cliente HTTP común
│       ├── components/
│       │   ├── ui/          # button, card, list, badge, sheet...
│       │   ├── layout/      # AppShell, Navbar, Sidebar
│       │   ├── PageHeader.tsx
│       │   └── EmptyState.tsx
│       ├── hooks/
│       ├── lib/             # utilidades (cn)
│       └── types/
├── public/
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```
