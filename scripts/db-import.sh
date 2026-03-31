#!/bin/bash
# Import database from a backup file in backups/
set -euo pipefail

source "$(dirname "$0")/../.env" 2>/dev/null || true

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  # If no file specified, use the latest backup
  BACKUP_FILE=$(ls -t "$(dirname "$0")/../backups/"backup_*.sql 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "Error: No se encontró ningún backup en backups/"
    echo "Uso: $0 [archivo.sql]"
    exit 1
  fi
  echo "Usando último backup: $(basename "$BACKUP_FILE")"
fi

# Resolve to absolute path
BACKUP_FILE=$(realpath "$BACKUP_FILE")
BASENAME=$(basename "$BACKUP_FILE")

echo "Importando ${BASENAME}..."

# Copy file into container and restore
docker cp "$BACKUP_FILE" cotizador_postgres:/tmp/restore.sql
docker exec cotizador_postgres psql \
  -U "${DB_USERNAME}" \
  -d "${DB_DATABASE}" \
  -f /tmp/restore.sql \
  --quiet
docker exec cotizador_postgres rm /tmp/restore.sql

echo "Base de datos restaurada desde ${BASENAME}"
