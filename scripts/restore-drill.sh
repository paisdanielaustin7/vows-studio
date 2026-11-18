#!/usr/bin/env bash
# VOWS — Automated Quarterly Restore Drill Script
# Reference: docs/RUNBOOK_RESTORE.md & SECURITY_PLAN.md §11
# Usage:
#   RESTORE_DB_URL="postgresql://..." BACKUP_SQL_FILE="./latest.sql" ./scripts/restore-drill.sh

set -euo pipefail

if [ -z "${RESTORE_DB_URL:-}" ]; then
  echo "ERROR: RESTORE_DB_URL (scratch database URL) is required." >&2
  exit 1
fi

echo "=== VOWS Restore Drill ==="
echo "[1/4] Applying version-controlled Supabase migrations to scratch instance..."
npx supabase db push --db-url "$RESTORE_DB_URL"

if [ -n "${BACKUP_SQL_FILE:-}" ] && [ -f "$BACKUP_SQL_FILE" ]; then
  echo "[2/4] Restoring logical snapshot ($BACKUP_SQL_FILE) inside transaction..."
  psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL app.reset_in_progress = 'on';
\i ${BACKUP_SQL_FILE}
COMMIT;
SQL
else
  echo "[2/4] No BACKUP_SQL_FILE provided — verifying clean migrated schema state."
fi

echo "[3/4] Checking RLS enforcement across all public tables..."
UNPROTECTED_TABLES="$(psql "$RESTORE_DB_URL" -Atc "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;")"
if [ "$UNPROTECTED_TABLES" != "0" ]; then
  echo "FAIL: Found $UNPROTECTED_TABLES public table(s) without Row Level Security enabled!" >&2
  psql "$RESTORE_DB_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"
  exit 1
fi
echo "PASS: All public tables have Row Level Security enabled."

echo "[4/4] Verifying financial integrity & payment allocation consistency..."
DRIFT_ROWS="$(psql "$RESTORE_DB_URL" -Atc "
  SELECT COUNT(*) FROM (
    SELECT p.id
    FROM payments p
    JOIN payment_allocations pa ON pa.payment_id = p.id
    WHERE p.status = 'recorded'
    GROUP BY p.id, p.amount_paise
    HAVING SUM(pa.allocated_amount_paise) != p.amount_paise
  ) AS allocation_drift;
")"

if [ "$DRIFT_ROWS" != "0" ]; then
  echo "FAIL: Detected $DRIFT_ROWS payment allocation drift row(s)!" >&2
  exit 1
fi
echo "PASS: Zero payment allocation drift detected."
echo "=== Restore Drill PASSED ==="
