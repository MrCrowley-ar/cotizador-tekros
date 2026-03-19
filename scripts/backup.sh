#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — dump the Postgres database to backups/<timestamp>[_note].sql.gz
#
# Usage:
#   ./scripts/backup.sh              # no note
#   ./scripts/backup.sh "antes-de-migracion"
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present (for DB_* variables)
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USERNAME="${DB_USERNAME:-tekros_user}"
DB_PASSWORD="${DB_PASSWORD:-tekros_secret}"
DB_DATABASE="${DB_DATABASE:-cotizador_db}"
CONTAINER="${POSTGRES_CONTAINER:-cotizador_postgres}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
NOTE="${1:-}"
NOTE_SLUG=""
if [ -n "$NOTE" ]; then
  # slugify: lowercase, spaces→dashes, strip non-alphanumeric
  NOTE_SLUG="_$(echo "$NOTE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')"
fi

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

FILENAME="${BACKUP_DIR}/${TIMESTAMP}${NOTE_SLUG}.sql.gz"

echo "→ Creating backup: $FILENAME"

PGPASSWORD="$DB_PASSWORD" docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U "$DB_USERNAME" "$DB_DATABASE" \
  | gzip > "$FILENAME"

SIZE=$(du -h "$FILENAME" | cut -f1)
echo "✓ Done — $SIZE"
echo ""

# Show last 5 backups
echo "Recent backups:"
ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 | awk '{print "  " $5 "  " $9}'
