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

Después de un git pull, si cambiaron dependencias o migraciones, repetir los pasos 4, 6 y 8.

