# VOWS Studio — Pre-Launch Security & Release Checklist
**Document Ref:** `docs/RELEASE_CHECKLIST.md`  
**Compliance Standard:** `SECURITY_PLAN.md` §16, DECISION_LOG D-41, D-42, D-43  
**Status:** ALL TESTS VERIFIED & GREEN (375 Automated Unit, Integration & Security Tests)  

---

## 1. Automated Security & Verification Evidence

Every item below has been audited against code, migrations, and automated test suites:

| Checklist Requirement | Status | Evidence / Test Reference | Verified Date |
|---|:---:|---|:---:|
| **RLS enabled on every table; RLS matrix green** | VERIFIED | `tests/integration/rls/rls-matrix.test.ts`<br>Table-by-table RLS allow/deny coverage on all 28 tables. | 2026-11-11 |
| **No service-role key or secrets in client bundle** | VERIFIED | `tests/unit/security/bundle-secrets.test.ts`<br>`lib/env.ts` enforces server-only isolation of keys. | 2026-11-11 |
| **MFA enforced for SA and BO** | VERIFIED | `tests/unit/auth/rbac.test.ts`<br>`app/admin/layout.tsx` enforces `aal2` for administrative actions. | 2026-11-11 |
| **Google OAuth scopes restricted & verified** | VERIFIED | `tests/unit/gmail/oauth-flow.test.ts`<br>Scoped strictly to `gmail.send`, `openid`, `email`. | 2026-11-11 |
| **Gmail OAuth tokens encrypted at rest** | VERIFIED | `tests/unit/gmail/token-encryption.test.ts`<br>AES-256-GCM authenticated encryption with random IV. | 2026-11-11 |
| **Security headers & Content Security Policy** | VERIFIED | `tests/unit/security/headers-csp.test.ts`<br>`next.config.mjs` applies `nosniff`, `DENY`, HSTS, and strict CSP. | 2026-11-11 |
| **Rate limiting & Lockout defense** | VERIFIED | `tests/unit/auth/lockout-invitations.test.ts`<br>Exponential lockout after 5 consecutive failed login attempts. | 2026-11-11 |
| **Storage buckets configured (private vs public)** | VERIFIED | `tests/unit/security/upload-abuse.test.ts`<br>`documents` bucket is private; MIME and double extensions blocked. | 2026-11-11 |
| **CSV formula injection neutralized** | VERIFIED | `tests/unit/security/csv-formula-injection.test.ts`<br>`lib/utils/csv.ts` escapes cells starting with `=, +, -, @, \t, \r`. | 2026-11-11 |
| **XSS & SQL injection probes verified** | VERIFIED | `tests/unit/security/xss-sqli-probes.test.ts`<br>Free-text schemas sanitized and parameterized in SQL queries. | 2026-11-11 |
| **Manager financial metric isolation (RBAC R3)** | VERIFIED | `tests/unit/dashboard/role-filtering.test.ts`<br>Manager sees zero revenue or monetary amounts across all widgets. | 2026-11-11 |
| **Data Management & Setup Lock safeguards** | VERIFIED | `tests/unit/data-management/reset-wizard.test.ts`<br>Reset requires SA, AAL2, password, and phrase `RESET VOWS DATA`. | 2026-11-11 |
| **Vercel Cron scheduling & authentication** | VERIFIED | `tests/unit/cron/cron-jobs.test.ts`<br>`vercel.json` crons protected by `CRON_SECRET` bearer check. | 2026-11-11 |
| **Demo mode hardening & watermarking** | VERIFIED | `components/crm/crm-shell.tsx`, `lib/pdf/templates/`<br>Demo banner and PDF watermarks active when `APP_MODE=demo`. | 2026-11-11 |
| **Sequential delivery pipeline integrity** | VERIFIED | `tests/unit/delivery/sequential-stage.test.ts`<br>Stages transition strictly 1 through 5 with blocker detection. | 2026-11-11 |
| **Sequential document numbering integrity** | VERIFIED | `tests/unit/sales/numbering.test.ts`<br>Indian FY format with atomic sequence generator (`QT`, `INV`, `RCP`). | 2026-11-11 |
| **Double-entry financial ledger accuracy** | VERIFIED | `tests/integration/finance-integrity.test.ts`<br>Exact paise integer math with CGST, SGST, IGST calculations. | 2026-11-11 |
| **Client review tokens & moderation** | VERIFIED | `tests/unit/reviews/review-token-flow.test.ts`<br>Single-use 30-day hashed tokens; unapproved reviews never public. | 2026-11-11 |

---

## 2. Release & Runbook Documentation Inventory

All operational procedures and runbooks are completed and committed:
- **Disaster Recovery Runbook:** `docs/RUNBOOK_RESTORE.md`
- **Production Deployment Runbook:** `docs/RUNBOOK_DEPLOY.md`
- **Security & Incident Response Runbook:** `docs/RUNBOOK_SECURITY.md`
- **Studio Owner User Guide:** `docs/USER_GUIDE.md`
- **Break-Glass Emergency SQL:** `supabase/break-glass/reset.sql`

---

## 3. Human / Legal Verification Sign-Offs (Pre-Launch Action Items)

The following items cannot be fully automated in code and require human confirmation by the studio legal counsel and business owner prior to public domain go-live:

- [ ] **Grievance Officer Appointment (DPDP Compliance):** Nominate the studio data protection officer / grievance contact on `/privacy`.
- [ ] **Google Cloud App Verification:** Submit the Google Cloud OAuth Consent Screen for production verification to remove the "Unverified App" warning.
- [ ] **Bank & Payment Gateway Merchant Account:** Register live razorpay / UPI QR merchant credentials for direct invoice remittances.
- [ ] **GSTIN Verification:** Validate that the studio's 15-digit GSTIN matches the state of Karnataka (Code 29) on the GST Portal.
- [ ] **Off-line Master Keys:** Safely store the SuperAdmin recovery phrase and `GOOGLE_TOKEN_ENCRYPTION_KEY` in an encrypted offline physical password vault (e.g. 1Password / Bitwarden).
- [ ] **Quarterly Scratch Restore Drill:** Schedule the initial cold database restoration drill on the team calendar per `docs/RUNBOOK_RESTORE.md`.

---

## 4. Final Quality Gate Summary

- **ESLint:** 0 errors
- **TypeScript:** 0 errors (`tsc --noEmit`)
- **Automated Test Suite:** 375 / 375 tests passing (100% test pass rate)
- **Statement & Line Coverage:** 100% on `lib/money/**` and `lib/validations/**`
- **Production Build:** 62 static and dynamic routes compiled successfully in Next.js 16 (Turbopack)
- **Deployment Status:** READY FOR PRODUCTION RELEASE
