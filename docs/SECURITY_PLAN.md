# VOWS Studio — Security Plan

> **Status:** Draft for review · **Date:** 2026-11-10 · **Depends on:** `DECISION_LOG.md`, `RBAC_PERMISSIONS.md`, `DATABASE_SCHEMA.md`
> **Scope:** Production system, demo environment, development process. Items marked **(Verify)** depend on external facts to confirm at implementation time (Decision Log Part H).

---

## 1. Security objectives

1. Client personal data and financial records are visible only to roles that need them.
2. No unauthorised change to money, documents or roles, and every change is attributable.
3. The studio's single outbound email channel (Gmail) cannot be hijacked or silently broken.
4. Business continuity: the studio can recover from data loss, a leaked secret, or a lost admin account.
5. The demo environment can never expose, or be mistaken for, real data.

---

## 2. Assets and data classification

| Class | Examples | Handling |
|---|---|---|
| **Restricted** | Gmail OAuth tokens, `SUPABASE_SERVICE_ROLE_KEY`, token encryption key, crew bank details, business bank details, invitation and review token hashes | Encrypted or hashed, service-role only, never logged, never sent to the browser |
| **Confidential** | Client names, phones, emails, addresses, GSTIN, invoices, payments, ledger, quotations, audit log, crew rates | RLS by role, TLS only, no PII in logs, retention rules (§10) |
| **Internal** | Bookings logistics, delivery notes, internal notes, settings | RLS by role |
| **Public** | Published portfolio, services, approved reviews, studio contact | Public buckets and public routes |

---

## 3. Threat model (summary)

| # | Threat | Example | Primary controls |
|---|---|---|---|
| T1 | Credential theft or guessing | Phished owner password | 12+ char passwords, mandatory MFA for SA and BO, lockout, breached-password check if enabled, alerts on new login (post-MVP) |
| T2 | Privilege escalation | Staff changes own role | Role guard trigger, RLS with no self-update of `role`, SA-only role changes, audit |
| T3 | Broken access control / IDOR | Crew opens another crew's booking by ID | RLS own-record policies, 404 on hidden rows, generated RLS test matrix |
| T4 | Data exfiltration through client | Service-role key in browser bundle | Server-only env vars, CI grep and bundle checks, separate clients per context |
| T5 | Injection | SQL in search; HTML in notes | Parameterised queries only, Zod validation, React escaping, no `dangerouslySetInnerHTML` without sanitiser |
| T6 | Financial tampering | Edit a paid invoice or payment | Immutability triggers, void-not-delete, functions for money writes, audit |
| T7 | CSRF | Cross-site POST using a logged-in cookie | SameSite Lax cookies, Server Action origin checks, Origin check on cookie-authenticated Route Handlers |
| T8 | Email abuse | Spam via the studio Gmail | Auth required, per-user send limit, idempotency, recipient validation, send log |
| T9 | Token leakage | Gmail refresh token in logs | App-layer AES-256-GCM, no token logging, key outside DB |
| T10 | Public form abuse | Bot floods enquiries | Honeypot, Turnstile, rate limiting, no anonymous table access |
| T11 | Malicious upload | HTML or script disguised as image | Allowlist MIME and extension, size limits, content sniffing, private buckets, `Content-Disposition` for downloads |
| T12 | CSV/formula injection | `=HYPERLINK(...)` in a client name exported | Prefix `'` to cells starting with `= + - @` in all exports |
| T13 | Demo/production mix-up | Real keys in demo, or MFA bypass in prod | Boot guard (D-32), separate projects, secret scanning |
| T14 | Supply chain | Malicious npm package | Lockfile, Dependabot, `npm audit` in CI, pinned GitHub Actions |
| T15 | Insider mistake | Wrong deletion | Soft delete, PITR, audit log, confirmations |
| T16 | Lost admin account | SA loses authenticator | Break-glass procedure (§12), two recovery codes stored offline |

---

## 4. Authentication

| Control | Specification |
|---|---|
| Provider | Supabase Auth, email and password only. Signup disabled. Magic links disabled (D-09, D-10). |
| Password policy | Minimum 12 characters with upper, lower, digit, special (AUTH-02). Enforced in Supabase settings and in forms. |
| MFA | TOTP. Mandatory for `system_admin` and `business_owner`, optional for others (D-02). Enrolment required before any app page. Policies also require `aal2` for these roles (RBAC §7). Ten single-use recovery codes are issued at enrolment, shown once. **(Verify** that the chosen Supabase plan supports TOTP MFA and the recovery approach; if not, recovery is by SA reset.) |
| Lockout | 5 failures in 15 minutes locks the account for 30 minutes (`auth_attempts`, `profiles.locked_until`). Generic error messages ("Invalid email or password") to avoid user enumeration. SA can unlock. |
| Sessions | Access token 1 hour, rotating refresh token, 30 days inactivity. Cookies `HttpOnly`, `Secure`, `SameSite=Lax`, managed by `@supabase/ssr`. Validate with `getUser()` on the server, never trust `getSession()` alone. |
| Session revocation | On role change, deactivation, password change, MFA reset: revoke all sessions for the user. |
| Password reset | Admin-generated recovery link sent through Gmail, valid 1 hour, single use. Responses never reveal whether an email exists. |
| Invitations | Single-use token, 256-bit random, stored hashed, 72 hours (D-10). |
| Logging | All auth events audited (AUTH-11) with IP and user agent. |

---

## 5. Authorization

- RBAC and RLS as specified in `RBAC_PERMISSIONS.md`. This plan adds the **security acceptance criteria**: the generated RLS matrix suite passes in CI, and no table exists without RLS enabled (a CI query lists tables with `relrowsecurity = false` and fails if any exist outside an explicit allowlist).
- The service-role client is limited to the uses in D-12 and lives only in server-only modules (`import 'server-only'`).
- Server Actions and Route Handlers: `requirePermission` first, Zod second, database call third.
- Admin routes need `system_admin` at `aal2`.
- Sensitive operations (role change, MFA reset, Gmail connect/disconnect, GST toggle, numbering change, void payment, reallocation) require a **recent login** (re-enter password if the session is older than 15 minutes) **(Verify** feasible with Supabase reauthentication; otherwise re-prompt via password check Server Action).

---

## 6. Data protection

### 6.1 In transit
HTTPS only. HSTS with a long max-age and `includeSubDomains` once all subdomains are HTTPS. No mixed content.

### 6.2 At rest
- Supabase encrypts disks and backups.
- **Application-layer encryption** for the highest-sensitivity values: Gmail tokens and crew bank details, AES-256-GCM with random nonce per value and a versioned key id stored with the ciphertext so keys can rotate.
- Business bank details are low-sensitivity public-on-invoice data but are still limited by RLS to SA and BO for reading in the UI.

### 6.3 Tokens
Invitation, review and delivery-share tokens: at least 256 bits from a CSPRNG, only the SHA-256 hash stored, constant-time comparison, short expiry, single use where applicable, rate-limited lookups, uniform "invalid or expired" response.

### 6.4 Secrets and key management

| Secret | Where | Rotation |
|---|---|---|
| Supabase service role key | Vercel env (server only) | Rotate on any suspected exposure and every 12 months |
| `GOOGLE_CLIENT_SECRET` | Vercel env | On exposure; annually |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Vercel env + offline copy in the owner's password manager | Versioned key id; rotation re-encrypts `gmail_credentials` and crew bank details in a one-off script |
| Upstash, Turnstile secrets | Vercel env | On exposure |
| Database password | Password manager | On exposure |

Rules: secrets never in the repo, never in `NEXT_PUBLIC_*` variables, never in logs or error messages; `.env*.local` ignored; secret scanning (GitHub push protection) enabled; separate values for dev, preview, production and demo.

---

## 7. Application security controls

| Area | Control |
|---|---|
| Input validation | Zod schemas shared by form and server, enforced again at the database (CHECKs, enums). Reject unknown fields. |
| Output encoding | React default escaping. Rich text (privacy page, FAQ, email templates) sanitised with an allowlist sanitiser on save and on render. PDF text is rendered as text, not HTML. |
| SQL | Supabase client and RPC with parameters only; no dynamic SQL built from input. |
| CSRF | Server Actions use same-origin enforcement. Cookie-authenticated Route Handlers that mutate state verify `Origin`/`Host`. No state change on GET. Logout is POST. |
| Open redirects | `redirect` parameter allowlisted to same-origin relative paths. |
| File upload | Presigned upload with server-validated bucket, size and MIME allowlist (images `jpeg/png/webp`, documents `pdf`, brand `png/svg/jpeg`). SVG logos sanitised or rasterised. Random storage names (UUID). Original name stored in the DB only. |
| Downloads | Private files only through short-lived signed URLs generated after permission checks; `Content-Disposition: attachment` for non-image types. |
| Exports | Formula-injection neutralisation (T12). Export actions audited. |
| Errors | Users see a safe message and a request id. Stack traces and SQL errors stay in server logs. |
| Business logic abuse | Idempotency keys on email send; unique constraints; rate limits (below). |

### 7.1 Security headers and CSP

| Header | Value |
|---|---|
| `Content-Security-Policy` | Nonce-based. `default-src 'self'`; `script-src 'self' 'nonce-…' https://challenges.cloudflare.com`; `style-src 'self' 'unsafe-inline'` (or nonce); `img-src 'self' data: blob: https://<project>.supabase.co`; `connect-src 'self' https://<project>.supabase.co`; `frame-src https://challenges.cloudflare.com` plus the map embed host if used; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, payment disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| CRM and admin responses | `Cache-Control: private, no-store` |

### 7.2 Rate limiting and bot protection (D-11)

| Target | Limit |
|---|---|
| Login attempts | 10 per 15 min per IP, plus account lockout per email |
| Password reset and invitation lookups | 5 per hour per IP and per email |
| Public endpoints | 60 per minute per IP |
| Public enquiry and review submit | 5 per hour per IP, honeypot plus Turnstile |
| Authenticated API/actions | 300 per minute per user |
| PDF generation | 10 per minute per user |
| Email send | 20 per hour per user |
| Token pages (`/review/[token]`, `/delivery/[token]`) | 30 per minute per IP |

Limits return `429` with `Retry-After`.

---

## 8. Storage security

| Bucket | Access | Notes |
|---|---|---|
| `portfolio`, `branding` | Public read; write by SA, BO (and MG for portfolio upload if later allowed) | Only images the studio has consent to publish (§10.4) |
| `documents`, `client-uploads`, `expense-receipts`, `crew-assets` | Private, signed URLs, role-scoped policies | Path convention encodes entity ids; access is checked against the owning row |
| All | MIME and size allowlists configured at bucket level; uploads registered in `files` | |

Storage objects are **not** covered by database point-in-time recovery (§11), so private buckets get a periodic export.

---

## 9. Logging, monitoring and alerting

| Item | Specification |
|---|---|
| Audit log | Append-only, database triggers, retained 8 years for financial and 7 for client data, SA full view, BO scoped view |
| Application logs | Vercel logs without PII or secrets; request id correlates to error codes returned to users |
| Error tracking | Sentry (or equivalent) with PII scrubbing enabled. Optional at launch, recommended before go-live. |
| Alerts | Supabase: high error rate, storage and database size thresholds. Vercel: failed deployments, function errors. Uptime monitor on `/` and `/login`. |
| Security events to watch | Repeated lockouts, role changes, MFA resets, Gmail disconnects, void payments, bulk exports |
| Review cadence | Monthly glance at audit log filters for the events above |

---

## 10. Privacy and compliance (India)

### 10.1 Legal basis
The studio is the **data fiduciary** for client and crew personal data. Obligations come from the **Digital Personal Data Protection Act, 2023** and the **DPDP Rules, 2025** (notified 13 November 2025; Board provisions already in force; the main fiduciary obligations such as notice, consent, safeguards, breach reporting and erasure phase in with a compliance date of about 13 May 2027), and the Information Technology Act, 2000 with its reasonable-security-practices requirements. The system is built to comply from launch. This plan is not legal advice; confirm details with a qualified advisor before go-live.

### 10.2 Principles applied

| Principle | Implementation |
|---|---|
| Notice and consent | Enquiry and review forms show a short privacy notice with a link to `/privacy` and a consent checkbox stating purpose (responding to the enquiry, providing services). Consent timestamp stored with the enquiry. |
| Purpose limitation | Client data used for quotations, bookings, invoicing, delivery and reviews. Marketing use requires separate consent (not built in V1). |
| Data minimisation | Optional fields stay optional. No Aadhaar, PAN of clients or other government ID collected. |
| Accuracy and correction | Clients' data editable by authorised staff; requests handled by the owner. |
| Retention | See §10.3. |
| Erasure | See §10.5. |
| Security safeguards | This document. |
| Breach handling | See §13. |
| Children | Events may involve minors. Photographs of minors in the portfolio need guardian consent (§10.4). |
| Grievance | `/privacy` names a contact (owner email) and response timeline. |

### 10.3 Retention schedule

| Data | Minimum retention | After |
|---|---|---|
| Financial records (invoices, payments, receipts, credit notes, expenses, ledger sources) | 8 years from creation (RETENTION-02) | Review annually; delete or archive only by SA with approval |
| Client personal data | 7 years (RETENTION-01) | Anonymise on request or at end of purpose and legal need |
| Enquiries never converted | 2 years from last activity (suggested) | Anonymise or delete |
| Audit log | 8 years | Archive |
| Auth attempts | 90 days | Purge |
| Expired tokens (invitation, review, share) | 30 days after expiry | Purge |
| Generated PDFs | Life of the document | Same as parent |

### 10.4 Portfolio consent
A portfolio item cannot be published without `client_consent_confirmed_at` (database constraint). The UI asks the publisher to confirm written or recorded consent from the client, and for minors, a guardian. Consent evidence is kept in `client-uploads`. Takedown on request within a stated timeframe.

### 10.5 Erasure and anonymisation
`anonymise_client(client_id)` (SA only, audited): replaces name, contact details, address and notes with neutral placeholders, removes phone and email rows, detaches guest contact fields on linked enquiries, keeps all financial rows with the client's id so records remain consistent for the retention period. Documents already sent as PDFs are not recalled. The privacy notice explains this.

### 10.6 Data location and processors
Supabase (ap-south-1 Mumbai region recommended), Vercel, Google (Gmail), Upstash, Cloudflare Turnstile. Each is a processor; the privacy page lists them. Confirm each region and data-processing terms **(Verify)**.

---

## 11. Backup and disaster recovery

| Item | Specification |
|---|---|
| Database | Supabase Pro daily backups (7 days) plus a **nightly logical export** of critical tables to external storage. **PITR is an optional paid add-on (about $100 per month per 7 days)** and is not enabled at launch (Decision D-31); revisit after real revenue or any incident. |
| RPO / RTO targets | RPO ≤ 24 hours without PITR, ≤ 15 minutes with PITR; RTO ≤ 4 hours |
| Storage | Weekly export of `documents`, `expense-receipts`, `client-uploads`, `crew-assets` and `portfolio` to an independent location (second cloud bucket or encrypted external drive). Generated PDFs can be regenerated from data, but receipts and uploads cannot. |
| Config and keys | Offline copy (password manager vault) of: token encryption key, Google OAuth credentials, Supabase project refs, DNS and domain registrar login. |
| Restore drill | Once before launch, then quarterly: restore to a scratch Supabase project, run the financial integrity script (F-01…F-08), confirm login and PDF generation. |
| Code | GitHub private repo with branch protection; Vercel keeps deployment history for rollback. |
| Migrations | Version-controlled; no manual schema edits in production. |

---

## 12. Operational security

### 12.1 Break-glass
If the only SA loses MFA: use Supabase project owner access to reset MFA factors in the Auth dashboard, then re-enrol. Project owner credentials are protected by a hardware key or authenticator and a recovery code stored offline. Every use is recorded in an incident note.

### 12.2 Off-boarding
Deactivate the user (sessions revoked), reassign follow-ups and delivery stages, rotate any shared secrets they knew, review audit log for their last 30 days.

### 12.3 Environment separation

| Environment | Supabase | Vercel | Secrets |
|---|---|---|---|
| Local | Local CLI | — | `.env.local`, throwaway |
| Dev / Preview | `vows-studio-dev` | Preview | Dev-only |
| Production | `vows-studio-prod` | Production | Production-only |
| Demo | `vows-studio-demo` | Separate project | Demo-only |

Production data is never copied to dev or demo. Test accounts never exist in production.

### 12.4 Development process
Branch protection on `main` and `dev`; PR review (self-review checklist for a solo developer); CI runs lint, typecheck, unit and integration tests, `npm audit`, secret scan; Dependabot weekly; GitHub Actions pinned to commit SHAs; two-factor on GitHub, Vercel, Supabase, Google, Cloudflare, Upstash and the domain registrar.

---

### 12.5 Data reset safeguards (D-43)
The reset feature is the most destructive operation in the system, so it is gated by layers: SA role at `aal2`; password re-entry; typed confirmation phrase; dry run; mandatory pre-reset export (abort on failure); transaction-local flag honoured only by `app.reset_business_data`; function callable by the service role only; refuses to run unless `setup_mode` is true or the environment is demo; **Lock setup** is irreversible in the app, which restores the 8-year financial retention guarantee for real data; every reset and lock is audited with scope and counts; alert on any `data_reset` or `setup_lock` event. The boot guard (D-32) prevents demo mode from being enabled on the production project. **Break-glass after lock:** only the Supabase project owner, with MFA, running a reviewed SQL script from the repository (`supabase/break-glass/reset.sql`) after taking a manual backup, and recording an incident note. This is intentionally not available through the application.

## 13. Incident response

| Step | Action |
|---|---|
| 1. Detect | Alert, user report, or audit-log review |
| 2. Contain | Disable affected accounts, revoke sessions, rotate exposed secrets, disconnect Gmail if tokens may be exposed |
| 3. Assess | Scope from audit log and Vercel/Supabase logs: which data, which users, since when |
| 4. Eradicate and recover | Fix root cause, restore data if needed (PITR), redeploy |
| 5. Notify | If personal data was breached: inform affected individuals without delay and the Data Protection Board of India without delay, with a detailed report within 72 hours (DPDP Rules, Rule 7). Certain incident types also fall under CERT-In's separate 6-hour reporting; confirm applicability with an advisor. Tell affected clients clearly what happened and what to do |
| 6. Review | Written post-incident note with timeline, cause, fixes; update this plan |

Keep a contact sheet (owner, developer, hosting support, legal advisor) offline.

---

## 14. Demo environment hardening (D-32)

- Separate Supabase and Vercel projects; no production credentials anywhere in demo.
- Boot guard: the app refuses to start if `APP_MODE` and the Supabase project ref do not match the allowlist. MFA is bypassed **only** if both match the demo values.
- Demo has no real Gmail connection, no invitation sending, and watermarked PDFs.
- Demo accounts and passwords are public by design; the data is synthetic with invalid phone numbers and `@demo.email` addresses.
- Weekly reset; rate limits and Turnstile on public forms.
- Repo secret scanning; a checklist from the Portfolio Plan §6 runs before publishing the demo URL.

---

## 15. Security test plan (feeds TESTING_PLAN)

| Test | Frequency |
|---|---|
| Generated RLS allow/deny matrix | Every PR (CI) |
| Table RLS-enabled check | Every PR |
| Money immutability: attempt edit of paid invoice, delete payment, update audit_log | Every PR (integration) |
| Role escalation attempts | Every PR |
| Gmail token never appears in responses, logs or client bundle | Pre-release (bundle grep, log review) |
| Service-role key absent from client bundle | Every build |
| Header and CSP check | Pre-release |
| Upload abuse (wrong MIME, oversize, double extension, SVG script) | Pre-release |
| XSS and SQLi probes in all free-text fields; CSV injection export | Pre-release |
| Rate limiting and lockout | Pre-release |
| Token pages: guess, replay, expired | Pre-release |
| Backup restore drill | Quarterly |
| Dependency audit | Weekly (Dependabot) |
| Third-party review of RLS before launch (Brief R-03) | Once, Phase 10 |

---

## 16. Pre-launch security checklist

- [ ] RLS enabled on every table; RLS matrix suite green
- [ ] No service-role key or secrets in client bundle or repository history
- [ ] MFA enrolled for SA and BO; recovery codes stored offline
- [ ] Google consent screen: External, In production, scope gmail.send only plus openid email
- [ ] Gmail tokens encrypted; disconnect revokes at Google
- [ ] Security headers and CSP verified
- [ ] Rate limiting and Turnstile active
- [ ] Buckets configured (public vs private) and policies tested
- [ ] Backup plan active (Pro daily backups plus nightly export; PITR decision recorded), restore drill completed, storage export scheduled
- [ ] Alerts and uptime monitoring configured and deliberately triggered once
- [ ] Privacy page, consent text and grievance contact published
- [ ] Portfolio consent flow tested; no unconsented items live
- [ ] Demo environment verification checklist (Portfolio Plan §6) passed
- [ ] Legal items marked **(Verify)** reviewed
