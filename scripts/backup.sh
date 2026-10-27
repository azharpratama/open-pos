#!/bin/bash
# Universal PostgreSQL Database Backup Script
# Creates a plain SQL dump using pg_dump from DATABASE_URL
# Usage: ./scripts/backup.sh

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="openpos_backup_${TIMESTAMP}.sql"
BACKUP_DIR="backups"

mkdir -p "$BACKUP_DIR"

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/openpos}"

echo "Starting database backup..."
pg_dump "$DB_URL" -F p -f "${BACKUP_DIR}/${FILENAME}"

echo "Backup completed successfully!"
echo "Saved to: ${BACKUP_DIR}/${FILENAME}"
echo ""
echo "To restore this backup, run:"
echo "psql \"$DB_URL\" -f \"${BACKUP_DIR}/${FILENAME}\""
