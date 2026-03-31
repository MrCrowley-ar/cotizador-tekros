@echo off
REM Exportar base de datos a backups/
setlocal

for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value ^| find "="') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%%dt:~4,2%%dt:~6,2%_%dt:~8,2%%dt:~10,2%%dt:~12,2%"
set "FILENAME=backup_%TIMESTAMP%.sql"

echo Exportando base de datos...
docker exec cotizador_postgres pg_dump -U tekros_user -d cotizador_db --no-owner --no-acl > "backups\%FILENAME%"

echo Backup guardado en backups\%FILENAME%
pause
