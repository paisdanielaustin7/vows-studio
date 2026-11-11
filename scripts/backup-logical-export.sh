#!/usr/bin/env bash
# VOWS Studio — Nightly Logical Export Script
# Reference: docs/RUNBOOK_RESTORE.md & SECURITY_PLAN.md §11
# Usage:
#   DATABASE_URL="postgresql://..." DR_MASTER_KEY="..." BACKUP_TARGET_S3_URI="s3://vows-studio-backups/prod" ./scripts/backup-logical-export.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required." >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/vows-backups}"
mkdir -p "$BACKUP_DIR"

PLAIN_FILE="$BACKUP_DIR/vows_logical_${TIMESTAMP}.sql"
GZ_FILE="${PLAIN_FILE}.gz"
ENC_FILE="${GZ_FILE}.enc"

echo "[1/4] Exporting VOWS Studio critical schemas and tables..."
pg_dump "$DATABASE_URL" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file="$PLAIN_FILE"

echo "[2/4] Compressing logical export..."
gzip -9 "$PLAIN_FILE"

if [ -n "${DR_MASTER_KEY:-}" ]; then
  echo "[3/4] Encrypting snapshot with AES-256-CBC + PBKDF2..."
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -in "$GZ_FILE" \
    -out "$ENC_FILE" \
    -pass env:DR_MASTER_KEY
  rm -f "$GZ_FILE"
  ARTIFACT="$ENC_FILE"
else
  echo "[3/4] DR_MASTER_KEY not set — skipping encryption (local archive only)."
  ARTIFACT="$GZ_FILE"
fi

if [ -n "${BACKUP_TARGET_S3_URI:-}" ]; then
  echo "[4/4] Uploading $ARTIFACT to $BACKUP_TARGET_S3_URI ..."
  aws s3 cp "$ARTIFACT" "${BACKUP_TARGET_S3_URI%/}/$(basename "$ARTIFACT")"
  aws s3 cp "$ARTIFACT" "${BACKUP_TARGET_S3_URI%/}/latest.$(basename "$ARTIFACT" | cut -d. -f2-)"
else
  echo "[4/4] BACKUP_TARGET_S3_URI not set — stored locally at $ARTIFACT"
fi

echo "Logical export complete: $ARTIFACT"
