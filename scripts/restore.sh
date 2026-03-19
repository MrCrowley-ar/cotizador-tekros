#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# restore.sh — restore the database from a backup file
#
# Usage:
#   ./scripts/restore.sh                            # lists available backups
#   ./scripts/restore.sh backups/20240101_120000.sql.gz
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USERNAME="${DB_USERNAME:-tekros_user}"
DB_PASSWORD="${DB_PASSWORD:-tekros_secret}"
DB_DATABASE="${DB_DATABASE:-cotizador_db}"
BACKUP_DIR="$ROOT_DIR/backups"

# ── List mode (no argument) ────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  echo "Available backups:"
  echo ""
  if ls "$BACKUP_DIR"/*.sql.gz 1>/dev/null 2>&1; then
    i=1
    while IFS= read -r -d $'\0' f; do
      SIZE=$(du -h "$f" | cut -f1)
      BNAME=$(basename "$f")
      printf "  [%d] %-45s %s\n" "$i" "$BNAME" "$SIZE"
      ((i++))
    done < <(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql.gz" -print0 | sort -z -r)
    echo ""
    echo "Usage: ./scripts/restore.sh <filename>"
  else
    echo "  No backups found in $BACKUP_DIR"
  fi
  exit 0
fi

# ── Restore mode ──────────────────────────────────────────────────────────
BACKUP_FILE="$1"

# Allow relative paths
if [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$ROOT_DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "✗ File not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠ This will DROP and recreate the database '$DB_DATABASE'."
echo "  Backup: $(basename "$BACKUP_FILE")"
echo ""
read -r -p "Are you sure? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "→ Dropping and recreating database..."
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U "$DB_USERNAME" -c "DROP DATABASE IF EXISTS \"$DB_DATABASE\";"
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  psql -U "$DB_USERNAME" -c "CREATE DATABASE \"$DB_DATABASE\" OWNER \"$DB_USERNAME\";"

echo "→ Restoring from $(basename "$BACKUP_FILE")..."
gunzip -c "$BACKUP_FILE" \
  | PGPASSWORD="$DB_PASSWORD" docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
      psql -U "$DB_USERNAME" -d "$DB_DATABASE"

echo ""
echo "✓ Restore complete."
