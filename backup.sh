#!/bin/bash
# Backup de la base de datos PostgreSQL
# Uso: ./backup.sh
# Genera un archivo .sql con timestamp en ./backups/

set -e

# Cargar vars desde .env si existe
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_USER="${DB_USERNAME:-tekros_user}"
DB_NAME="${DB_DATABASE:-cotizador_db}"

mkdir -p backups

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="backups/backup_${TIMESTAMP}.sql"

echo "Generando backup: $FILE ..."
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$FILE"
echo "Backup completado: $FILE"
echo ""
echo "Para restaurar en otro servidor:"
echo "  cp $FILE backups/restore/init.sql"
echo "  docker compose down -v && docker compose up -d"
