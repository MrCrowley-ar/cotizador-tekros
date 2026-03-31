@echo off
REM ============================================================
REM  Cotizador Tekros — Setup completo
REM  Levanta Docker, espera la BD, e importa el backup
REM ============================================================

echo.
echo ========================================
echo   Cotizador Tekros — Setup
echo ========================================
echo.

REM ── 1. Verificar .env ──────────────────────────────────────
if not exist .env (
    echo [1/4] Creando .env desde .env.example...
    copy .env.example .env >nul
    echo       Edita .env si necesitas cambiar credenciales.
) else (
    echo [1/4] .env ya existe, OK.
)

REM ── 2. Levantar Docker ─────────────────────────────────────
echo [2/4] Levantando containers...
docker compose up -d --build

REM ── 3. Esperar que Postgres esté listo ─────────────────────
echo [3/4] Esperando que la base de datos este lista...
:wait_db
docker compose exec -T postgres pg_isready -U tekros_user -d cotizador_db >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_db
)
echo       Base de datos lista.

REM ── 4. Esperar que el backend corra migraciones ────────────
echo [4/4] Esperando que el backend termine migraciones...
:wait_backend
curl -s -o nul -w "" http://localhost:3001/api >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_backend
)
echo       Backend listo.

REM ── 5. Importar backup si existe ───────────────────────────
set "LATEST="
for /f "delims=" %%f in ('dir /b /o-d backups\backup_*.sql 2^>nul') do (
    if not defined LATEST set "LATEST=%%f"
)

if defined LATEST (
    echo.
    echo Importando backup: %LATEST%
    docker cp "backups\%LATEST%" cotizador_postgres:/tmp/restore.sql
    docker exec cotizador_postgres psql -U tekros_user -d cotizador_db -f /tmp/restore.sql --quiet
    docker exec cotizador_postgres rm /tmp/restore.sql
    echo Backup importado correctamente.
) else (
    echo.
    echo No se encontro backup en backups\. Saltando importacion.
    echo La BD arranca limpia con el usuario admin del .env.
)

echo.
echo ========================================
echo   Todo listo!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ========================================
echo.
pause
