
Esta guía fija cómo se escribe el frontend para que los seis módulos parezcan escritos por una sola persona, aunque los genere un agente distinto cada vez. Las reglas salen de `SPRINT-0/S0-05-arquitectura.md` (sección 4) y de los RNF de `SPRINT-0/S0-04-rnf.md`.

## 1. Nombres

| Elemento              | Regla                                                   | Ejemplo                                |
| --------------------- | ------------------------------------------------------- | -------------------------------------- |
| Componentes y tipos   | PascalCase                                              | `ReservaForm`, `Comanda`, `PagoCreate` |
| Variables y funciones | camelCase                                               | `crearReserva`, `totalComanda`         |
| Constantes            | MAYÚSCULAS con guion bajo                               | `LIMITE_PAGINA`, `ESTADOS_COMANDA`     |
| Archivos              | Un componente por archivo, con el nombre del componente | `ReservaForm.tsx`                      |
| Nombres de negocio    | En español e iguales al diagrama de clases              | `Reserva`, `Comanda`, `Mesa`           |

```tsx
// Bien
export function ReservaForm() { ... }
const LIMITE_PAGINA = 50;
function crearReserva(datos: ReservaCreate) { ... }
```

```tsx
// Mal
export function reserva_form() { ... }
const limitePagina = 50;
function createReservation() { ... }
```

Si el nombre del negocio está en el diagrama de clases, no se traduce ni se inventa un sinónimo.

## 2. Estructura de carpetas

La estructura es la de S0-05, sección 4.1: una carpeta por módulo con `pages/`, `components/`, `api.ts` y `types.ts`; lo común vive en `shared/`.

```text
src/
├── modules/
│   └── reservas/
│       ├── pages/
│       ├── components/
│       ├── api.ts
│       └── types.ts
└── shared/
    ├── api/
    ├── components/
    ├── hooks/
    └── types/
```

```ts
// Bien: el módulo usa lo común
import { ClienteApi } from "../../shared/api/client";
import type { Reserva } from "./types";

// Mal: importa las tripas de otro módulo
import { crearMesa } from "../salon/api";
```

Un módulo nunca importa archivos internos de otro. Si algo se comparte, se mueve a `shared/`.

## 3. Componentes

- Funcionales y con hooks; no se usan clases salvo para `ErrorBoundary`.
- Props siempre tipadas.
- Una función no pasa de 50 líneas y tiene complejidad ciclomática máxima de 10 (RNF-MAN-05).
- Los datos se piden fuera del JSX y se renderiza con variables ya resueltas.

```tsx
// Bien
interface ReservaCardProps {
  reserva: Reserva;
}

export function ReservaCard({ reserva }: ReservaCardProps) {
  const etiqueta = reserva.confirmada ? "Confirmada" : "Pendiente";
  return (
    <article>
      <h2>{reserva.cliente}</h2>
      <Badge>{etiqueta}</Badge>
    </article>
  );
}
```

```tsx
// Mal: componente sin props tipadas y lógica dentro del JSX
export function ReservaCard({ reserva }) {
  return <Badge>{fetch(`/reservas/${reserva.id}`).then(() => "ok")}</Badge>;
}
```

## 4. Llamadas a la API

Toda llamada pasa por el `api.ts` del módulo (D-16), que usa el cliente de `shared/api`. Los componentes no llaman a `fetch` directamente. La URL base sale de `VITE_API_URL`.

```ts
// modules/reservas/api.ts
import { ClienteApi } from "../../shared/api/client";
import type { Reserva, ReservaCreate } from "./types";

const api = new ClienteApi(import.meta.env.VITE_API_URL);

export function listarReservas(): Promise<Reserva[]> {
  return api.get<Reserva[]>("/reservas");
}

export function crearReserva(datos: ReservaCreate): Promise<Reserva> {
  return api.post<Reserva>("/reservas", datos);
}
```

```tsx
// Mal: fetch escondido en el componente
useEffect(() => {
  fetch(`${import.meta.env.VITE_API_URL}/reservas`)
    .then((respuesta) => respuesta.json())
    .then(setReservas);
}, []);
```

`import.meta.env` solo se lee en `api.ts`; el resto del módulo consume funciones con tipos.

## 5. TypeScript

- `strict: true` en `tsconfig.json` (D-17).
- Prohibido `any`: si no se conoce el tipo, se usa `unknown` y se valida.
- Los tipos de la API van en el `types.ts` del módulo.
- Se prefiere `import type` para tipos.
- Se respetan `noUnusedLocals`, `noUnusedParameters` y `noUncheckedIndexedAccess`.

```ts
// Bien
interface Reserva {
  id: number;
  cliente: string;
  fecha: string;
}

function parsearReserva(dato: unknown): Reserva {
  return dato as Reserva; // se valida antes de castear
}
```

```ts
// Mal
function parsearReserva(dato: any) {
  return dato;
}
```

## 6. Seguridad

Todo lo que llega al navegador es público (RNF-SEG-04). No se guardan claves, tokens privados ni rutas internas en el código del frontend. La configuración se lee de variables de entorno y `.env` no se versiona.

```ts
// Bien
const api = new ClienteApi(import.meta.env.VITE_API_URL);
```

```ts
// Mal
const API_KEY = "sk-live-123456";
const api = new ClienteApi("https://interno.empresa.local");
```

## 7. Lint y formato

ESLint revisa errores y reglas; Prettier da formato. Un PR no se integra si falla cualquiera de los dos (RNF-MAN-03).

```bash
npm run lint          # 0 errores y 0 warnings
npm run format:check  # Prettier sin cambios pendientes
npm run typecheck     # tsc --noEmit
```

Reglas destacadas:

- `@typescript-eslint/no-explicit-any`: error.
- `@typescript-eslint/consistent-type-imports`: error.
- `no-restricted-globals` para `fetch`: error, salvo en `shared/api/client.ts`.
- `max-lines-per-function` (50) y `complexity` (10) en `src/modules/**`.
- `eslint-config-prettier` al final para que ESLint no discuta el formato.

No se agregan reglas nuevas sin actualizar este documento.

## 8. Configuración lista para copiar

### `frontend/eslint.config.js`

```js
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Las llamadas a la API van por el api.ts del módulo (D-16).",
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 10],
    },
  },
  {
    files: ["src/shared/api/client.ts"],
    rules: { "no-restricted-globals": "off" },
  },
  prettier,
);
```

### `frontend/.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### `tsconfig.json` (opciones que exige la guía)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

Las reglas `max-lines-per-function` y `complexity` se aplican a `src/modules/**`, que es el código que producen los seis módulos. `shared/` ya está construido desde S1-06; al modificarlo se respetan las mismas reglas aunque el linter no las fuerce todavía.

## Fuentes

- `SPRINT-0/S0-05-arquitectura.md`, sección 4.
- `SPRINT-0/S0-04-rnf.md`, RNF-MAN-03, RNF-MAN-05, RNF-SEG-04.
- [react.dev/learn](https://react.dev/learn), TypeScript `strict`, ESLint y Prettier.
