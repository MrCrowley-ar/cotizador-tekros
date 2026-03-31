@echo off
REM Importar base de datos desde un backup
setlocal

set "BACKUP_FILE=%~1"

if "%BACKUP_FILE%"=="" (
    REM Buscar el ultimo backup
    for /f "delims=" %%f in ('dir /b /o-d backups\backup_*.sql 2^>nul') do (
        set "BACKUP_FILE=backups\%%f"
        goto :found
    )
    echo Error: No se encontro ningun backup en backups\
    echo Uso: %~0 [archivo.sql]
    pause
    exit /b 1
)

:found
echo Importando %BACKUP_FILE%...
docker cp "%BACKUP_FILE%" cotizador_postgres:/tmp/restore.sql
docker exec cotizador_postgres psql -U tekros_user -d cotizador_db -f /tmp/restore.sql --quiet
docker exec cotizador_postgres rm /tmp/restore.sql
echo Base de datos restaurada.
pause
