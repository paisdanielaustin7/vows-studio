# VOWS Studio — Security & Incident Response Runbook
**Document Ref:** `docs/RUNBOOK_SECURITY.md`  
**Compliance Standards:** SECURITY_PLAN §12, §13, §15, DECISION_LOG D-43  
**Audience:** Super Administrator, Security Incident Handler  

---

## 1. Secret Rotation Protocols

All production secrets must be rotated periodically (every 180 days) or immediately upon suspected compromise.

### 1.1 Supabase Service Role Key Rotation
1. Navigate to Supabase Dashboard > Project Settings > API.
2. Under **Project API Keys**, generate a new `service_role` key.
3. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel Environment Variables.
4. Trigger a production redeployment in Vercel.
5. In Supabase Dashboard, revoke the old service role key after confirming zero failed API calls in logs.

### 1.2 Google Token Encryption Key Rotation
When rotating `GOOGLE_TOKEN_ENCRYPTION_KEY`:
1. Generate new 32-byte key: `export NEW_KEY=$(openssl rand -hex 32)`.
2. Retrieve currently encrypted refresh tokens using the old key.
3. Decrypt tokens in memory and re-encrypt using the new key with fresh IVs.
4. Update `gmail_credentials` table with new ciphertext.
5. Update `GOOGLE_TOKEN_ENCRYPTION_KEY` in Vercel and redeploy.

### 1.3 Vercel CRON_SECRET Rotation
1. Generate new 32-character secret: `openssl rand -base64 32`.
2. Update `CRON_SECRET` in Vercel Environment Variables.
3. Vercel automatically propagates `CRON_SECRET` to scheduled jobs within 60 seconds.

---

## 2. Break-Glass Procedure (Emergency Recovery)

If the SuperAdmin is locked out, or if the CRM application is completely unavailable, the database owner may execute the break-glass procedure.

### Rules of Engagement
- **Strictly Manual Execution:** Break-glass scripts are NEVER callable via HTTP APIs or Next.js server actions.
- **Location:** `supabase/break-glass/reset.sql`.
- **Pre-requisite:** Direct access to Postgres superuser connection string.

### Execution Steps
1. Connect via `psql` to the primary Postgres database:
   ```bash
   psql "$PROD_DATABASE_URL"
   ```
2. Inspect the break-glass script:
   ```bash
   cat supabase/break-glass/reset.sql
   ```
3. Begin transaction and execute:
   ```sql
   BEGIN;
   -- Follow commented instructions in supabase/break-glass/reset.sql
   -- Audit entry will be automatically generated with actor 'break-glass-dba'
   COMMIT;
   ```
4. Immediately rotate all DBA passwords and record incident in `public.audit_log`.

---

## 3. Incident Response Protocol

### Severity Levels
- **P0 (Critical Breach):** Database credentials or service-role key leaked; unauthorized administrative access.
- **P1 (High Impact):** Client PII accessed without authorization; financial ledger tampering detected.
- **P2 (Operational Glitch):** Rate limit flood; Gmail relay disconnected; scheduled cron failure.

### P0/P1 Containment Checklist
1. **Quarantine Tenant:**
   - In Vercel, set maintenance header or restrict IP allowlist to studio atelier.
   - In Supabase, toggle `setup_mode` to `true` or pause public network access temporarily.
2. **Revoke Active Sessions:**
   - Execute in Supabase SQL editor:
     ```sql
     -- Revoke all active user sessions across all devices
     DELETE FROM auth.refresh_tokens;
     UPDATE auth.users SET updated_at = NOW();
     ```
3. **Rotate Secrets:**
   - Immediately rotate `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, and database passwords.
4. **Inspect Audit Log:**
   - Query `public.audit_log` to establish blast radius and compromised user accounts:
     ```sql
     SELECT * FROM audit_log 
     WHERE created_at > NOW() - INTERVAL '24 hours' 
     ORDER BY created_at DESC;
     ```
5. **DPDP Compliance Notification (India):**
   - Under the Digital Personal Data Protection (DPDP) Act, if personal data of clients has been compromised, notify the Data Protection Board of India (DPBI) and affected individuals within the mandated statutory timeframe.

---

## 4. Off-boarding Procedure

When an employee, photographer, or manager leaves VOWS Studio:
1. Navigate to `/admin/users` in the Admin Console.
2. Select user profile > Click **Deactivate Account**.
3. Deactivation immediately:
   - Sets `is_active = false` in `profiles`.
   - Revokes active Supabase Auth sessions.
   - Unassigns user from upcoming event stages.
4. If the departing user had administrative privileges, rotate shared OAuth credentials.
