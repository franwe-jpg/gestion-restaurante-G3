# Flujo diario

Todo desde la raíz del repositorio.

## Linux

1. Actualizar develop:      git checkout develop && git pull origin develop
2. Rama nueva:      git checkout -b feature/<ID>-<descripcion>
3. Backend (terminal 1):        cd backend && source .venv/bin/activate && uvicorn app.main:app --reload
4. Frontend (terminal 2):       cd frontend && npm run dev
5. Abrir http://localhost:5173

## Windows (PowerShell)

1. Actualizar develop:      git checkout develop; git pull origin develop
2. Rama nueva:      git checkout -b feature/<ID>-<descripcion>
3. Backend (terminal 1):        cd backend; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload
4. Frontend (terminal 2):       cd frontend; npm run dev
5. Abrir http://localhost:5173

## Con Docker (opcional)

Levanta backend y frontend con un solo comando, sin instalar Python ni Node. Requiere Docker: Docker Desktop en Windows y macOS; en Linux o WSL, Docker Engine con tu usuario en el grupo `docker`.

1. Levantar:      docker compose up --build
2. Abrir http://localhost:5173 (frontend) y http://localhost:8000/docs (API)
3. Detener:      Ctrl+C, o `docker compose down` si lo levantaste con `-d`

- El backend aplica `alembic upgrade head` al arrancar. La base queda en un volumen de Docker: `docker compose down -v` la borra.
- Los cambios en el código se recargan solos, sin reconstruir.
### Me trabé con...

- **`permission denied ... /var/run/docker.sock`** (Linux o WSL): tu usuario no está en el grupo `docker`. Corré `sudo usermod -aG docker $USER` y reiniciá la sesión. En WSL, ejecutá `wsl --shutdown` desde PowerShell de Windows (no desde Ubuntu) y abrí la terminal de nuevo. Verificá con `docker ps`.

## Primera vez

### Linux

1. Entrar al backend:       cd backend
2. Crear el entorno:        python3 -m venv .venv
3. Activarlo:       source .venv/bin/activate
4. Dependencias:        pip install -r requirements.txt
5. Configuración:       cp .env.example .env
6. Base de datos:       alembic upgrade head
7. Entrar al frontend:      cd ../frontend
8. Dependencias:        npm install
9. Configuración:       cp .env.example .env

### Windows (PowerShell)

1. Entrar al backend:       cd backend
2. Crear el entorno:        py -3.12 -m venv .venv
3. Activarlo:       .venv\Scripts\Activate.ps1   (si da error: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned)
4. Dependencias:        pip install -r requirements.txt
5. Configuración:       Copy-Item .env.example .env
6. Base de datos:       alembic upgrade head
7. Entrar al frontend:      cd ..\frontend
8. Dependencias:        npm install
9. Configuración:       Copy-Item .env.example .env

## Inicio de sesión y roles

Todo el sistema pide inicio de sesión (HU-TR-01). Una base nueva, o una base anterior a esta HU, queda **sin usuarios**: hay que crear el primer encargado desde `backend/`, con el entorno virtual activo y después de `alembic upgrade head`:

```bash
python -m scripts.crear_encargado --correo encargado@ejemplo.com
```

El script pide la contraseña por la terminal (de 8 a 72 bytes) y no la muestra. Pide la contraseña dos veces; si el correo ya existe, informa el error y no cambia nada. Después se entra a la pantalla de inicio de sesión del frontend con ese correo.

- Roles: **encargado** (todo, y es el único que gestiona mozos y chefs), **mozo** (salón, atención, reservas y pagos, sin reportes) y **chef** (carta, menús y comandas en solo lectura).
- Los mozos cargados antes de esta HU no tienen usuario: el encargado debe editarlos y asignarles correo y contraseña (si queda vacía, se conserva la actual cuando ya tiene usuario). Los chefs se crean desde la pestaña «Chefs» de Salón.
- `BCRYPT_RONDAS` (en `backend/.env`, ejemplo en `.env.example`) fija el costo del cifrado de las contraseñas. El valor de ejemplo es 12; las pruebas usan un valor bajo para ir rápido. No subir el `.env` al repositorio.
- La sesión dura mientras la pestaña esté abierta y se cierra desde el menú del encabezado.

Después de un git pull, si cambiaron dependencias o migraciones, repetir los pasos 4, 6 y 8.

