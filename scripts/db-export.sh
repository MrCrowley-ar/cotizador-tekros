#!/bin/bash
# Export database to backups/ folder (timestamped)
set -euo pipefail

source "$(dirname "$0")/../.env" 2>/dev/null || true

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql"

echo "Exportando base de datos..."
docker exec cotizador_postgres pg_dump \
  -U "${DB_USERNAME}" \
  -d "${DB_DATABASE}" \
  --no-owner \
  --no-acl \
  > "$(dirname "$0")/../backups/${FILENAME}"

echo "Backup guardado en backups/${FILENAME}"
ls -lh "$(dirname "$0")/../backups/${FILENAME}"
