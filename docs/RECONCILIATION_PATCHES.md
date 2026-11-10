# VOWS Studio — Reconciliation Patches for Documents 01–08

> **Date:** 2026-11-10 · **Source of truth:** `DECISION_LOG.md` and `GLOSSARY_AND_ENUMS.md`
> **Why this file exists:** The eight original documents are not editable from the planning workspace, so every correction is listed here as an exact patch. Apply them with the Antigravity task in `ANTIGRAVITY_MASTER_PROMPT.md` (Task 0), or by hand.
> **Rules:** `Find` is the text to locate (a short unique snippet). `Replace` is what it becomes. `Delete` removes it. `Add` inserts new text at the stated place. Do not change anything not listed. After patching, add this banner as the first line under the title of each document:
>
> `> **Reconciled 2026-11-10.** Where this document disagrees with DECISION_LOG.md or GLOSSARY_AND_ENUMS.md, those files win.`

**Global replacements (all eight files):** `paisa` → `paise`; `_paisa` → `_paise`; `Paisa` → `Paise`; `middleware.ts` (as the route-protection file) → `proxy.ts`; `user_profiles` → `profiles`; `audit_logs` → `audit_log`; `old_value`/`new_value` (audit columns) → `old_values`/`new_values`; `SUPABASE_SERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`; `PDF_ENCRYPTION_KEY` and `ENCRYPTION_KEY` → `GOOGLE_TOKEN_ENCRYPTION_KEY`; `NEXT_PUBLIC_DEMO_MODE` → `APP_MODE` (server) with `NEXT_PUBLIC_APP_MODE` mirror; `business_owner`/`sysadmin` identifiers → `system_admin`, `business_owner`.

---

## 01_PROJECT_BRIEF.md

| # | Location | Find | Replace |
|---|---|---|---|
| 1 | §5.1 stack table | `Next.js App Router` / `v14+` | `Next.js 16 App Router` / `Node 20.9+, proxy.ts, Server Components` |
| 2 | §5.1 | Tailwind `v3+` | `v4` |
| 3 | §5.1 | `React-PDF / Puppeteer (server-side)` | `@react-pdf/renderer (Node runtime, Route Handler)` |
| 4 | §4.1 S-15 | `(mandatory SysAdmin, optional others)` | `(mandatory SysAdmin and Business Owner, optional others)` |
| 5 | §6.1 | `MFA mandatory for SysAdmin` paragraph | `MFA mandatory for SysAdmin and Business Owner: both require TOTP at aal2 before any app page loads.` |
| 6 | §8.1 C-04 | whole sentence about "1 billion messages/day … 100/day for personal" | `Personal Gmail allows about 500 recipients per day shared across all clients (API: 500 recipients per message); Workspace 2,000. Verified Nov 2026.` |
| 7 | C-06 | `Vercel serverless function execution timeout (default 10s …)` | `Vercel Pro is required (Hobby is non-commercial). Set maxDuration on the PDF route. Asynchronous PDF generation is deferred (D-28).` |
| 8 | C-07 | `GDPR/IT Act compliance` | `DPDP Act 2023 / DPDP Rules 2025 and IT Act 2000 compliance` |
| 9 | R-02 mitigation | `Use background job queue or Supabase Edge Function with longer timeout` | `Use maxDuration on Vercel Pro; async job queue deferred (D-28)` |
| 10 | R-04 mitigation | `local fallback read cache for critical data` | `Daily backups plus nightly export; restore drill quarterly` |
| 11 | §7 SC-04 | `Visual regression tests for quote, invoice, receipt PDFs` | `PDF smoke tests that extract text and assert key fields` |
| 12 | SC-10 | `Vercel free/pro tier` | `Vercel Pro` |
| 13 | §9 bullet | `publicly viewable demo mode or read-only preview environment` | `writable demo environment (separate Supabase and Vercel projects, weekly reset)` |
| 14 | §10 phase table | whole table | `See 07_IMPLEMENTATION_ROADMAP.md, Phases 0–10, as amended by DECISION_LOG D-40.` |

## 02_REQUIREMENTS_SPECIFICATION.md

| # | Location | Find | Replace |
|---|---|---|---|
| 1 | AUTH-03 | `for the **System Administrator** role` | `for the **System Administrator** and **Business Owner** roles` |
| 2 | AUTH-06 | after `expire after 72 hours.` | Add `Implemented with an invitations table and hashed single-use tokens (D-10).` |
| 3 | AUDIT-02 | `ip_address`, `user_agent` | Add `(mandatory for auth events, best effort for data mutations, D-15)` |
| 4 | AUDIT-06 | `India's Information Technology Act, 2000 and IT (Amendment) Act, 2008` | `India's Information Technology Act, 2000 (as amended) and the Digital Personal Data Protection Act, 2023 with the DPDP Rules, 2025` |
| 5 | AUTHZ-05 | end of matrix | Add `Action-level rules and rulings R1–R7 are in RBAC_PERMISSIONS.md and take precedence.` |
| 6 | AUTHZ-06 | `Returning a 403 response (not 404) for forbidden resources is required.` | Add `Exception: rows hidden by own-record RLS (for example another crew member's booking) return 404 (D-13).` |
| 7 | GST-02 | `_amount_paisa` names | `_paise`; rates remain `_bps` |
| 8 | DOCNUM-02 | after the Receipt line | Add `Booking: BK-{YYYY}-{NNNNNN}; Credit note: CN-{YYYY}-{NNNNNN}.` |
| 9 | DOCNUM-05 | `configurable per document type in Settings` | `configurable per document type by System Administrator only` |
| 10 | QT-04 | status chain | `draft → sent → accepted | rejected | superseded; expired is derived; viewed is reserved and unused in V1` |
| 11 | QT-NFR-01 | `receives a "Generating — we'll notify you" message and the PDF is generated asynchronously` | `receives a failure message with a retry. Asynchronous generation is deferred (D-28)` |
| 12 | INV-05 | `linked invoice` | `allocated to one or more invoices through payment allocations; the payment must be fully allocated (D-21)` |
| 13 | INV-10 | `a credit note (a negative-value invoice)` | `a credit note document (CN series) linked to the invoice (D-22)` |
| 14 | §6.5 edge case | `must be warned at the UI level and blocked server-side unless the user explicitly overrides` | `is blocked in V1; create an advance invoice first (D-21)` |
| 15 | LED-01 | `An income entry is automatically created for each payment` | `The ledger is a database view over payments, manual income entries and expenses (D-23)` |
| 16 | LED-09 | `deleted only if the payment record is voided` | `excluded from the ledger when the payment is voided` |
| 17 | Module 08 | add roles table | `Roles: SA, BO full; MG, AC, ST view; CR none (RBAC R5).` |
| 18 | SET-04 / SET-05 | | `Document numbering is System Administrator only. User management lives at /admin/users.` |
| 19 | GMAIL-01 | `gmail.send` scope | `gmail.send plus the non-sensitive openid and email scopes to identify the connected account (D-03)` |
| 20 | WEB-01 | `Home, Portfolio, Services, Pricing, About, Contact/Enquiry, Reviews/Testimonials` | `Home, Portfolio, Services and Pricing (one page), About, Contact (enquiry form), Reviews, FAQ, Privacy, Terms` |
| 21 | CLI-01 | phones and emails | Add `Stored in child tables (client_phones max 3, client_emails max 2).` |

## 03_ARCHITECTURE.md

| # | Location | Change |
|---|---|---|
| 1 | §1.1 diagram | Delete the `RT` (Realtime) node and its arrows, and the `GCAL` node. |
| 2 | §1.4 and §3.1 sequence diagrams | `user_profiles` → `profiles`. Role comes from the JWT claim `user_role` (D-05), not a DB read per request. |
| 3 | §3.2 | Delete `/signup` from the auth routes line. Replace `middleware.ts` with `proxy.ts`. |
| 4 | §3.3 | `refresh tokens (rolling, 7-day)` → `refresh tokens (rolling, 30-day inactivity)`. |
| 5 | §3.4 | `System Admin users are enrolled in TOTP-based MFA at account creation` → `System Admin and Business Owner are forced through MFA enrolment at first login`. |
| 6 | §3.5 | Replace the whole section: `Role is carried in the verified JWT claim user_role, populated by a Custom Access Token Hook from profiles.role. Role changes and deactivation revoke sessions immediately. user_metadata is never used for authorization (D-05).` |
| 7 | §4.1 | Replace the ladder with the six roles from the glossary. |
| 8 | §4.3 | Replace the example policy with `USING (app.has_role('system_admin','business_owner','manager','accountant','staff'))` and delete the `user_profiles` subquery. |
| 9 | §5.3 | Replace with `No Supabase Realtime in V1. Dashboard auto-refreshes every 5 minutes; the notification bell polls every 60 seconds (D-30).` |
| 10 | §5.5 and §2.1 `api/` tree | Keep Route Handlers only for: public endpoints, OAuth callback, PDF/CSV downloads, cron, token pages, upload presign (D-06). |
| 11 | §2.1 tree | Remove `(auth)/logout/page.tsx`, `(admin)/tenants`, `crm/settings/team`, `(public)/enquiry/`. Add `(auth)/mfa/enroll`, `(public)/contact/thank-you`, `(public)/faq`, `privacy`, `terms`, `(public)/review/[token]`, `(public)/delivery/[token]`, `crm/schedule`, `crm/portfolio`, `crm/audit-log`, settings pages `billing-gst`, `numbering`, `email-templates`, `expense-categories`, `website`. Rename `middleware.ts` to `proxy.ts`. Add root directories `supabase/`, `tests/`, `emails/`, and under `lib/`: `money/`, `pdf/`, `gmail/`, `auth/`. Delete `lib/utils/currency.ts` (replaced by `lib/money`). |
| 12 | §6.2 | `private/pdfs/` bucket → `documents` bucket. |
| 13 | §7.2 | After `React Email … templates` add `Layout and styling are React Email components; subject and body content are owner-editable database templates with whitelisted merge tags (D-27).` |
| 14 | §8.1 bucket table | Replace with the six buckets in GLOSSARY §10. |
| 15 | §11.1 | `(or per tenant in future multi-tenant mode)` → delete. Table is `business_settings` singleton. |
| 16 | §12.2 env table | Replace with GLOSSARY §9. |
| 17 | §12.4 | Replace with D-32 (same repo, second Vercel and Supabase project, writable, weekly reset, boot guard). |

## 04_API_CONTRACTS.md

Add this banner after the title: `Most authenticated mutations are Server Actions (D-06). This document now specifies Route Handler contracts only. Permission names are in RBAC_PERMISSIONS.md.`

| # | Change |
|---|---|
| 1 | **Authentication Levels table:** replace the `viewer+/editor+/manager+` rows with permission strings (`clients:view`, `invoices:create`, …) from RBAC §3, plus `public`, `authenticated`, `token`. |
| 2 | **Section 1 Auth:** keep only `GET /auth/callback` (Route Handler). Login, logout, forgot/reset password, MFA, invite and accept become Server Actions. Invite roles enum → `business_owner, manager, accountant, staff, crew_member`. Invite expiry → 72 hours. Password minimum → 12. |
| 3 | **Section 2 Users:** convert all to Server Actions with `users:manage` (SA only), except `users:update:self`. Role enum → six roles. Remove `POST /api/users` (invites only). |
| 4 | **Sections 3–6, 10–11:** convert to Server Actions. Keep only these Route Handlers: CSV exports (`/api/*/export`) and PDF downloads. Replace every auth label with the RBAC permission. Enum fixes: enquiry statuses per GLOSSARY §3; quotation `approved` → `accepted`; booking drop `tentative`, add `in_progress`; event/crew/expense/payment enums per GLOSSARY §4; crew create adds `crewType`; client create takes `phones[]` (max 3), `emails[]` (max 2). |
| 5 | **Section 5 Quotations:** remove per-line discount concept (none exists in the API), `discount` becomes `{ type: "percent" | "fixed", value }` (bps or paise). `PATCH` creates a new version only for sent/accepted/rejected. Add `GET /api/quotations/[id]/pdf` download. |
| 6 | **Section 7 Invoices:** `DELETE` → `cancel` action. Statuses per GLOSSARY. Add credit notes (`CN`) as Server Actions. |
| 7 | **Section 8 Payments:** remove `PATCH` and `DELETE`. Replace with `voidPayment` and `reallocatePayment` actions. Request body takes `allocations: [{ invoiceId, amountPaise }]` that must sum to `amountPaise`. Add receipt download route. |
| 8 | **Section 9 Ledger:** permissions `ledger:view` (SA, BO, AC). Manager is not allowed. |
| 9 | **Section 13 Delivery:** replace item model with one pipeline per booking and 9 stages. Endpoints: stage update, assignees, attachments (links and small files), share link (`/delivery/[token]`). |
| 10 | **Section 14 Reviews:** body takes `overallRating, communicationRating, qualityRating, punctualityRating, body, reviewerName`; statuses `pending, approved, rejected`; remove `wouldRecommend` and `hidden`. Token page `/review/[token]` added. |
| 11 | **Section 15 Settings:** `GET /api/settings` returns public studio fields to all signed-in users; billing and Gmail details only for SA and BO. Add Gmail OAuth: `GET /auth/gmail/start`, `GET /api/auth/gmail/callback`, test send, disconnect (Server Actions). Settings permissions: BO and SA (numbering SA only), not `manager+`. |
| 12 | **Section 16 Uploads:** bucket enum per GLOSSARY §10. Remove 2 GB video limit. Limits: images 20 MB, PDFs 10 MB, client uploads and delivery attachments 50 MB. |
| 13 | **Section 17 Public:** single public enquiry endpoint `POST /api/public/enquiry` (creates an enquiry only, Turnstile and honeypot, consent flag). Remove duplicate `POST /api/enquiries` public variant. |
| 14 | **Conventions:** error table row `404`: add `(also used for own-record rows hidden by RLS)`. Pagination: rename "cursor-based" to "page-based with optional cursor". Cookie name: `sb-<project-ref>-auth-token`. |
| 15 | **Add:** receipts, credit notes, follow-ups, activity feed, notifications, quotation templates, booking cancel/convert, crew pay, dashboard data, audit log as Server Actions or queries per D-06. |

## 05_INTEGRATION_PLAN.md

| # | Location | Change |
|---|---|---|
| 1 | §1.1 MFA | `required for System Admin and Business Owner roles`. Middleware snippet: delete the `user_metadata.role` and `user_metadata.aal` lines. Read the role from the verified `user_role` claim and AAL from `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. Role strings `system_admin`, `business_owner`. |
| 2 | §1.1 custom claims | Replace the `user_metadata`/`app_metadata` block with `Role is stored in profiles.role and injected as the user_role JWT claim by the Custom Access Token Hook (D-05).` |
| 3 | §1.1 and §1.2 code | `const cookieStore = cookies()` → `await cookies()` (Next.js 16). `createClient` import for admin client. |
| 4 | §1.1 auth config | After `Magic Links: DISABLED` add `Invitations and password reset links are generated by our own flow and sent through the connected Gmail (D-10).` |
| 5 | §1.3 bucket table | Replace with GLOSSARY §10. |
| 6 | §1.4 Realtime | Replace whole section with `Not used in V1 (D-30).` |
| 7 | §2.1 consent screen | `User type: Internal` → `User type: External, publishing status In production`. Scopes: add `openid`, `email`. Redirect URIs: localhost, production, and one fixed dev alias; no wildcard preview URLs. |
| 8 | §2.1 token storage | Replace `Supabase Vault or pgcrypto` with `application-layer AES-256-GCM using GOOGLE_TOKEN_ENCRYPTION_KEY, with a key id stored beside each ciphertext`. |
| 9 | §2.2 quotas | Add `Personal Gmail: about 500 recipients per day, shared across all clients.` |
| 10 | §3.3 | Replace single `/api/pdf/generate` with per-document Route Handlers (`/api/quotations/[id]/pdf`, `/api/invoices/[id]/pdf`, `/api/receipts/[id]/pdf`, `/api/credit-notes/[id]/pdf`) calling shared `lib/pdf`. |
| 11 | §3.6 fonts | Add `Embed a font that includes the ₹ glyph (for example Inter or Noto Sans); built-in PDF fonts do not.` |
| 12 | §4.1 | `Next.js 14+` → `Next.js 16`. |
| 13 | §4.2 env table | Replace with GLOSSARY §9. Delete `SUPABASE_JWT_SECRET`. |
| 14 | §4.3 | Gmail on previews: only on the fixed dev alias. |
| 15 | §1.2 DB functions list | Replace with the function list in DATABASE_SCHEMA §12. |

## 06_PORTFOLIO_CLONE_PLAN.md

| # | Location | Change |
|---|---|---|
| 1 | §1 diagram and table | `GitHub Repo: vows-studio-demo` → `same repository`; the demo is a second Vercel project plus a separate Supabase project (D-32). |
| 2 | §1 "Repository Setup" | Delete the clean-copy script block. Keep the rule `No real data, secrets or production history in the repo`. Add secret scanning. |
| 3 | §1 env gate | Add server-only `APP_MODE=demo` and `ALLOWED_SUPABASE_PROJECT_REF`; boot guard refuses to start on mismatch; MFA bypass only when both match. |
| 4 | §2.1 | Delete Razorpay, WhatsApp, SMS and webhook bullets (out of scope). Keep Gmail and PDF simulation. |
| 5 | §3.2 and §6 | Phone numbers `+91 98400 001XX` → `+91 00000 001XX` (clearly invalid). |
| 6 | §3.3–3.5 | Document numbers → `QT-2026-000001` style. Dates become relative to today via the seed script. |
| 7 | §4.2 | Create auth users first, then data that references them. Replace the `exec_sql` RPC with `psql` or the Supabase CLI seed. Extend `clearDemoData` to all tables in dependency order. |
| 8 | §5 table | Staff row: `Can read clients, enquiries and bookings; updates assigned delivery stages`. Add the boot-guard note beside the MFA bypass statement. |
| 9 | §7 Step 5 | Remove `PDF_ENCRYPTION_KEY`; add `APP_MODE`, `ALLOWED_SUPABASE_PROJECT_REF`, `CRON_SECRET`, Upstash, Turnstile test keys. |
| 10 | §8.2 | Note Hobby cron runs once per day; weekly reset is fine. Supabase Free pauses after inactivity; the weekly cron keeps it awake. |

## 07_IMPLEMENTATION_ROADMAP.md

| # | Location | Change |
|---|---|---|
| 1 | Header | `Next.js 15 App Router` → `Next.js 16`. |
| 2 | §2 Phase 0 | Replace the document list with the 16 current docs. Add: Google consent screen External and In production; Upstash and Turnstile accounts; Stitch designs generated from UI_DESIGN_SPEC §13. |
| 3 | §3 Phase 1 | `MFA (TOTP) enforcement for system_admin and staff` → `system_admin and business_owner`. Roles → six-role enum in `profiles`; delete the `roles` lookup table and `client_viewer`. Add: `invitations`, `auth_attempts`, Custom Access Token Hook, `proxy.ts`, RLS helper functions, role-guard and last-owner triggers. `Invite user (send magic link or set temp password)` → `Invite user (custom invitation link, 72 hours)`. |
| 4 | §4 Phase 2 | Add: Service Catalogue and packages with price history, quotation templates, document numbering and configuration, notifications table, GST calculation engine (UI hidden), `lib/money`. Numbering `QT-YYYY-NNNN` → `QT-{FY}-{NNNNNN}`. Remove `quotation_versions` and `snapshot (jsonb)`; use row-per-version (D-20). Remove per-item `discount_pct`. Statuses: `draft → sent → accepted | rejected | superseded`. RLS wording → six roles. |
| 6 | §5 Phase 3 | `BK-YYYY-NNNN` → `BK-{FY}-{NNNNNN}`. Conflict handling → warning with logged override (D-34). Status machine per GLOSSARY. Add `assign_crew` database function. |
| 7 | §6 Phase 4 | Delete `invoice_versions`, `ledger_entries`, invoice `snapshot (jsonb)`. Add: credit notes, crew pay records and payments, `record_payment`/`void_payment`/`reallocate_payment` functions, deferred constraint triggers, `manual_income_entries`, `ledger_entries_v` view. `Overdue detection (cron or on-load check)` → `overdue is derived in a view`. Status `cancelled` for invoices. |
| 8 | §7 Phase 5 | `google_tokens` with `user_id` → `gmail_credentials` single row. `Staff can connect` → `System Admin or Business Owner connects`. Add preview modal, idempotency key, daily send budget, change-account flow, password-reset and invitation emails through Gmail. `POST /api/gmail/send` → Server Action only. |
| 9 | §8 Phase 6 | Stages `Import → Cull → Edit → Export → Upload → Delivery` → the 9 stages in GLOSSARY §5. Delete `delivery_feedback`. Add share link page. |
| 10 | §9 Phase 7 | `POST /api/enquiries/public` → `POST /api/public/enquiry` with Turnstile, honeypot and consent. |
| 11 | §10 Phase 8 | Review fields: overall plus three category ratings; statuses `pending/approved/rejected`. Add website content and SEO settings. |
| 12 | §11 Phase 9 | Delete `MFA enforcement toggle per role` (SA and BO mandatory). Add: Data management at `/admin/system/data` (setup mode, setup checklist, Load sample data, Reset wizard with dry run and pre-reset export, Lock setup) per DECISION_LOG D-43, with `app.reset_business_data`, `app.lock_setup`, `app.load_sample_data`. |
| 13 | §12 Phase 10 | `Production Supabase: PITR enabled` → `Backup plan per SECURITY_PLAN §11`. |
| 14 | §15 DoD | Update Phase 1 roles, Phase 3 conflict rule, Phase 4 allocation and credit-note items, Phase 5 single-account Gmail. |

## 08_TESTING_PLAN.md

| # | Location | Change |
|---|---|---|
| 1 | §2 `vitest.config.ts` | Paths `src/...` → root (`lib/...`, `tests/...`). `include` adds `tests/integration/**` under a separate script `test:integration`. Per-folder thresholds: `lib/money/**` and `lib/validations/**` 100%. |
| 2 | §2.1 interface and tests | Replace `discountPct` per item with overall discount `{type, value}` in bps/paise. Fix test `rounds down (floor)` → `rounds half up`. Add tests: FY rollover on 1 April IST, IST date boundary, CGST/SGST odd-paise rounding, pro-rata discount apportionment sums exactly, credit note limits. |
| 3 | §2.4 | Roles → six roles. `staff quotations:create` → false; `staff invoices:view` → false; add manager, accountant cases from RBAC §3. |
| 4 | §3.1 | `audit_logs` → `audit_log`. Add the generated RLS allow/deny matrix test (RBAC §10). |
| 5 | §3.3 | `create_quotation_with_number` → `create_quotation`; add numbering test for `INV`, `RCP`, `BK`, `CN`. |
| 6 | §3.4 | `old_value`/`new_value` → `old_values`/`new_values`. Delete-client test → soft delete, action `soft_delete`. |
| 7 | §3.5 | Invert: cancelling a booking leaves invoices unchanged. |
| 8 | §4 Flow 1 | MFA required for system_admin and business_owner only. |
| 9 | §4 Flows 2–4 | Run as `business_owner` (or `manager` / `accountant` where permitted). Flow 3 step 11–12: conflict shows a warning that requires an override reason. |
| 10 | §4 Flow 5 | Path `/contact`. Assert an enquiry is created and **no client** is auto-created; consent stored. |
| 11 | §4 Flow 6 | Path `/admin/users`; custom invitation link; MFA setup mandatory only for SA and BO. |
| 12 | §5 | `PATCH /api/users/self` → role-change attempt through the profile action; signed URL expiry 1 hour; add Turnstile and CSV-injection checks. |
| 13 | §6 | Formula uses bps and half-up rounding; F-06 uses `ledger_entries_v`; delete the `Math.floor` rule. |
| 14 | §8 | Targets per D-41. |
| 15 | §9 CI | Add integration job: `supabase start` in GitHub Actions. Env names per GLOSSARY §9. |
| 16 | §1 | Add PDF smoke tests (text extraction) in place of visual regression. |
