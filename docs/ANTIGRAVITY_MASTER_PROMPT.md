# VOWS Studio — Antigravity Implementation Prompts

> **Date:** 2026-11-10 · **Target:** Google Antigravity with Gemini · **Project:** VOWS Studio CRM & Website
> **How to use:** (1) Put the 17 documents listed in §1 (the 8 older ones plus the 9 new ones, including RECONCILIATION_PATCHES.md) into the repository under `/docs`. (2) Paste **Part A** (the Master Prompt) once at the start of the session. (3) Then paste **one phase prompt from Part B at a time**, starting with Task 0. (4) After each phase, review, then paste the next. If the quota runs out, open a new session, paste Part A again, then paste the **Resume Prompt (Part C)**.
> **Why phase by phase:** the previous planning session ran out of quota mid-run. Each phase below ends with a committed checkpoint and an updated `PROGRESS.md`, so work never depends on one long session.

---

# Part A — Master Prompt (paste once per session)

```
You are the lead engineer for VOWS Studio, a single-business CRM and public website for a wedding photography and videography studio in India. The planning is finished and documented. Your job is to implement it exactly, phase by phase, with tests.

## 1. Read first (in this order) — from /docs
1. DECISION_LOG.md  — FINAL decisions. If any other document disagrees with it, DECISION_LOG.md wins.
2. GLOSSARY_AND_ENUMS.md — exact enum values, naming, env vars, buckets, numbering.
3. RBAC_PERMISSIONS.md — who can do what; RLS pattern.
4. DATABASE_SCHEMA.md — tables, constraints, views, functions, triggers, seeds, migration order.
5. DATABASE_ERD.md — relationships (schema wins on conflict).
6. BUSINESS_WORKFLOWS.md — state machines and process rules.
7. SECURITY_PLAN.md — security controls and checklist.
8. UI_DESIGN_SPEC.md — design tokens, components, pages. Stitch designs (if present in /design) are visual reference only.
9. RECONCILIATION_PATCHES.md — corrections to the older documents 01–08.
10. The older documents 01_PROJECT_BRIEF, 02_REQUIREMENTS_SPECIFICATION, 03_ARCHITECTURE, 04_API_CONTRACTS, 05_INTEGRATION_PLAN, 06_PORTFOLIO_CLONE_PLAN, 07_IMPLEMENTATION_ROADMAP, 08_TESTING_PLAN — read them AFTER applying RECONCILIATION_PATCHES (Task 0). Requirement IDs (for example QT-03, INV-10) come from document 02.

## 2. Non-negotiable rules
- Do not change architecture, roles, enums, table names, money handling or numbering. If something seems wrong or missing, STOP, add it to /docs/OPEN_QUESTIONS.md with your recommendation, and continue with the safest interpretation that follows the Decision Log.
- Stack: Next.js 16 (App Router, Node 20.9+, `proxy.ts` not `middleware.ts`), React 19, TypeScript strict, Tailwind v4, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, TanStack Query (client lists only), `@react-pdf/renderer`, Upstash ratelimit, Cloudflare Turnstile, Vitest, Playwright.
- Directory layout is root-level with NO `src/`: app/, components/, lib/, server/, types/, hooks/, supabase/, tests/, emails/, public/. Server Actions in server/actions/, queries in server/queries/ (Decision D-07).
- Authenticated mutations are Server Actions (validate with Zod → requirePermission → database function). Route Handlers only for public endpoints, OAuth callbacks, PDF/CSV downloads, cron and token pages (D-06).
- Money: integer paise (`bigint`, `_paise`), rates in basis points (`_bps`), round-half-up, ONLY via lib/money. Never use floats for money. Server recomputes all totals; database constraints verify them (D-16, D-17).
- Multi-row financial writes happen only in the Postgres functions listed in DATABASE_SCHEMA §12. Payments and allocations are immutable (void, never edit/delete). Invoices are never deleted.
- RLS enabled on every table, default deny, policies generated from RBAC §3. The service-role client is allowed only in the cases in D-12, only in server-only modules (`import 'server-only'`).
- Secrets only from environment variables named in GLOSSARY §9. Never commit secrets. Create `.env.example` with names only.
- No application feature may exist in the UI without its permission check on the server.
- Write tests with the code (see §4). A phase is not done until its tests pass.
- Keep every file focused and typed. No `any` without a comment. No dead code. No placeholder TODOs left in finished phases.

## 3. How you work (to survive quota and session limits)
1. At the start of each phase, create or update `/PROGRESS.md` with: phase name, task checklist (copy from the prompt), and status. Update it after EVERY task.
2. Commit after every task with message `phase-N: <task>`. Use branches `phase-N-name`; merge to `dev` only when the phase's Definition of Done is met.
3. Work in small, verifiable steps: write migration → write function/policy → write tests → run tests → build UI → verify.
4. After finishing a phase, STOP and report: what was built, test results, deviations (should be none), open questions. Do not start the next phase until told.
5. If you must stop mid-phase (quota, error), leave `/PROGRESS.md` accurate and the working tree committed. A later session resumes from PROGRESS.md.
6. When uncertain, prefer the simpler implementation that satisfies the documents. Do not add features that are not in the documents.

## 4. Testing and quality gates (every phase)
- `npm run lint`, `npm run typecheck`, `npm run test` (unit), `npm run test:integration` (needs `supabase start`) must pass.
- `lib/money/**` and `lib/validations/**`: 100% coverage (per-folder thresholds).
- Every table and role/action pair in RBAC §3 gets an automated allow/deny test (generated matrix) — start in Phase 1 and extend each phase.
- Add the tests named in the Definition of Done of each phase. Report any that you could not write and why.

## 5. UI rules
- Follow UI_DESIGN_SPEC tokens exactly (CSS variables, Inter + Cormorant Garamond, ₹ with Indian grouping, status badge map §6). Light and dark themes for the CRM; public site light only.
- If /design contains Stitch exports, match them visually, but data, permissions and behaviour come from the documents.
- Mobile first at 375 px; tables reflow to cards below 768 px; tap targets ≥ 44 px; WCAG 2.1 AA.
- Every list has loading (skeleton), empty and error states. Destructive actions use confirm dialogs that name the object and consequences.

## 6. Definition of "done" for the whole project
All phases complete, all gates green, SECURITY_PLAN §16 checklist ticked, demo environment seeded, setup-mode data management working, README with setup and deploy steps.

Acknowledge by listing the 10 documents you read and the 8 rules you consider most important. Then wait for the first phase prompt.
```

---

# Part B — Phase prompts (paste one at a time)

## Task 0 — Reconcile the older documents (do this first)

```
TASK 0: Apply /docs/RECONCILIATION_PATCHES.md to the eight older documents (01_PROJECT_BRIEF.md … 08_TESTING_PLAN.md).

Rules:
- Apply every global replacement and every numbered patch exactly as written. Do not rewrite or regenerate the documents; edit in place.
- Add the reconciliation banner under each document's title.
- For any patch whose "Find" text cannot be located, do not guess: record it in /docs/RECONCILIATION_REPORT.md (document, patch number, what you found instead).
- When finished, produce /docs/RECONCILIATION_REPORT.md listing: patches applied (count per document), patches skipped, and anything ambiguous.
- Create /PROGRESS.md and /docs/OPEN_QUESTIONS.md (empty headings).
- Commit as `docs: reconcile documents 01-08`.
Report and stop.
```

## Phase 0 — Project foundation

```
PHASE 0: Project foundation and tooling. Branch phase-0-foundation.

Tasks:
1. Scaffold Next.js 16 (TypeScript strict, App Router, Tailwind v4, ESLint) at repository root with the directory layout in Decision D-07. Add `proxy.ts` as a stub that passes requests through.
2. Install and configure: shadcn/ui (Radix), Zod, @supabase/ssr, @supabase/supabase-js, TanStack Query, @react-pdf/renderer, @upstash/ratelimit and @upstash/redis, date-fns and date-fns-tz, Vitest, Playwright, React Email, lucide-react, a drag-and-drop library for line items.
3. Design system: implement the tokens from UI_DESIGN_SPEC §2 as CSS variables (light and dark), fonts (Inter, Cormorant Garamond via next/font), spacing/radius/shadow tokens, and base components: Button, Input, Textarea, Select, Combobox, Dialog, Sheet, Tabs, Toast, Badge (status badge per §6 map), Table, Skeleton, EmptyState, Banner, ConfirmDialog, MoneyInput, PercentInput, PhoneInput, DatePicker. Build a hidden `/dev/components` page showing them (excluded in production).
4. lib/money: pure functions with exhaustive unit tests: toPaise/fromRupees, addPaise, multiply, percentOf (round-half-up, bps), applyDiscount (percent and fixed, capped), apportionDiscount (largest-remainder), computeGst (CGST/SGST per slab, IGST), formatINR (en-IN), parse. 100% coverage. Include the tests listed in RECONCILIATION_PATCHES for 08_TESTING_PLAN §2.
5. lib/utils: IST date helpers (today in Asia/Kolkata), financial-year helper (April start), phone E.164 helper, token generator + SHA-256 hash helper (256-bit), AES-256-GCM encrypt/decrypt with key id (for GOOGLE_TOKEN_ENCRYPTION_KEY) with tests.
6. Env validation module (Zod) using the names in GLOSSARY §9; app fails fast on missing server variables. Boot guard for APP_MODE vs ALLOWED_SUPABASE_PROJECT_REF (D-32), with tests.
7. Supabase CLI project in /supabase (config.toml, migrations folder, seed folder, tests folder). Scripts: `db:reset`, `db:test`, `types:generate`.
8. CI (GitHub Actions, pinned action SHAs): lint, typecheck, unit tests, integration job that runs `supabase start`, `npm audit`, secret scan. Dependabot config. Husky pre-commit (lint-staged).
9. Security headers and a nonce-based CSP in next.config / proxy per SECURITY_PLAN §7.1. `Cache-Control: private, no-store` for /crm and /admin.
10. README with local setup, env table, scripts, and the branching model (main, dev, phase branches).

Definition of Done: `npm run build` passes; unit tests for lib/money and lib/utils pass with 100% coverage on lib/money; CI workflow file is valid; component gallery renders in light and dark; PROGRESS.md updated; commits made.
```

## Phase 1 — Identity, roles, RLS foundation

```
PHASE 1: Identity, authentication, roles and the RLS foundation. Branch phase-1-auth. Specs: DATABASE_SCHEMA §2, §3, §17 (migrations 001–003, helpers from 002), RBAC (all), SECURITY_PLAN §4 and §5, Decision D-02, D-05, D-09, D-10, D-12, D-13, D-15.

Tasks:
1. Migrations 001 (extensions, ALL enums from DATABASE_SCHEMA §2), 002 (schema `app`, helper functions: role(), aal2(), is_active(), has_role(), crew_id(), assigned_to_event(), assigned_to_stage()), 003 (profiles, invitations, auth_attempts, audit_log, notifications, files, generation_errors).
2. Custom Access Token Hook (Postgres function) that adds the top-level `user_role` claim from profiles.role (per D-05: grants, revokes, policy for supabase_auth_admin). Document the dashboard setting to enable it.
3. Triggers: touch_updated_at, profile_role_guard, last_owner_guard, audit_trigger (generic, with column allowlist and secret stripping), block_mutation on audit_log. Audit helper to write auth events with ip and user agent.
4. First system_admin bootstrap script (`scripts/create-first-admin.ts`) using the admin API; refuses to run if one exists (DATABASE_SCHEMA §15 item 6).
5. Auth flows as Server Actions: login (with lockout via auth_attempts and generic errors), logout (POST), forgot-password and reset-password (admin generateLink recovery, 1 hour), invitation create/resend/revoke/accept (own invitations table, hashed token, 72 hours, creates auth user via admin API; if Gmail not connected, return the link for manual sharing).
6. MFA: TOTP enrolment at /mfa/enroll with recovery handling per SECURITY_PLAN §4, challenge at /mfa. Mandatory for system_admin and business_owner; optional prompt for others. Verify AAL via the Supabase AAL API, not metadata.
7. proxy.ts (thin): refresh session, read verified role claim, enforce MFA level and the route matrix in RBAC §6, landing page per role, redirect rules, 403 page for denied roles. No data queries.
8. lib/auth: getAuthenticatedUser(), requirePermission(), lib/constants/permissions.ts generated from RBAC §3 as `role → Set<permission>`. ActionResult<T> type and error codes (GLOSSARY §8).
9. Session revocation on role change, deactivation, password change, MFA reset.
10. Rate limiting wrapper (Upstash) with the tiers in SECURITY_PLAN §7.2; Turnstile verification helper; in-memory fallback for local dev only.
11. Admin pages (SA only): /admin/dashboard (basic counts), /admin/users (list, invite, role change, deactivate/reactivate, unlock, resend, MFA reset), /admin/audit-log (filters, expand diff). Business Owner scoped audit view at /crm/audit-log (RBAC R7). Self-profile page (name, avatar, password, MFA).
12. RLS policies (migration 014 part 1) for every table created so far; the generated RLS matrix test harness (tests/integration/rls/) that reads the RBAC matrix definition and asserts allow/deny for each role using real signed-in clients; table-level check that no public table lacks RLS.
13. Auth screens per UI_DESIGN_SPEC §7.2 and the CRM shell (sidebar, topbar, bottom nav on mobile, role-aware navigation §4, notification bell polling every 60 s, theme toggle), 403/404/500 pages.

Definition of Done: integration tests prove: every role lands on its landing page; SA/BO cannot reach /crm without aal2; deactivated user is locked out immediately; role cannot be self-changed; lockout works; invitation expires after 72 hours and is single use; audit rows written for auth events and role changes; audit_log cannot be updated or deleted; last-owner guard works; RLS matrix green for all existing tables. Report any Supabase setting that must be changed in the dashboard (hook, password rules, OTP expiry, refresh token lifetime).
```

## Phase 2 — Settings, catalogue, clients, enquiries, quotations

```
PHASE 2: Business configuration, catalogue, clients, enquiries and quotations. Branch phase-2-sales. Specs: DATABASE_SCHEMA §4–§7 (migrations 004–007), BUSINESS_WORKFLOWS §2.1, §2.2, §3.1–§3.4, D-16 to D-20, D-33, D-38, requirement IDs for modules CLI, ENQ, QT, SVC, SET, DOCNUM, GST.

Tasks:
1. Migrations 004–007 and seeds (document_number_config, expense_categories, email_templates, business_settings row, service_category_tax). app.next_document_number() with FY logic and a concurrency test (parallel calls produce unique gap-free numbers).
2. Settings pages (SA/BO; numbering SA only): studio profile, branding (logo upload to `branding` bucket), billing and GST (toggle audited as gst_toggle, GSTIN, rates, HSN/SAC per category, bank details), numbering, email templates (merge-tag whitelist, preview), expense categories, quotation templates. Settings read API returns public fields to all signed-in users and billing fields only to SA/BO.
3. Catalogue: services and packages with price history (effective_from), archive, show_on_website, package pricing rule, CSV import for SA/BO, current-price views.
4. Clients: child tables for phones (max 3) and emails (max 2), primary flags, duplicate detection warning (phone/email, trigram name), list with search, profile with tabs and activity feed, soft delete, CSV export with formula-injection protection.
5. Enquiries: manual create, list/kanban toggle, detail, explicit status changes per state machine, follow-ups (create, due, assignee, done), create/link client action, lost reason, junk. Public submission is built in Phase 7; implement the shared insert function now.
6. Quotations: create_quotation and create_quotation_version functions; builder UI exactly per UI_DESIGN_SPEC §8.2 (line-item editor with catalogue search, custom lines, templates, discount percent/fixed, live totals using lib/money, server recompute and rejection of mismatched totals, GST fields only when enabled); versioning rules; drafts editable, sent/accepted read-only; expiry derived via quotations_v; accept/reject/mark sent actions; activity entries; notifications.
7. Deferred constraint triggers (sum checks) for quotations/items; money CHECKs; tests that the database rejects wrong totals.
8. RLS policies for all new tables; extend the generated RLS matrix.
9. Dashboard skeleton page (/crm/dashboard) with enquiry and quotation widgets only; the rest comes later.

Definition of Done: numbering tests (FY rollover on 1 April IST, concurrency, per doc type); money and GST unit tests including odd-paise CGST/SGST and pro-rata discount; version tests (only one current per root); expiry derivation test; duplicate detection test; RLS matrix green; Manager can create clients but not delete; Staff cannot access quotations; E2E happy path: enquiry → client → quotation → sent (without email) → accepted.
```

## Phase 3 — Bookings, events, crew, schedule

```
PHASE 3: Bookings, events, crew and the schedule. Branch phase-3-bookings. Specs: DATABASE_SCHEMA §8 (migration 008), BUSINESS_WORKFLOWS §2.3, §3.4, §3.5, §3.8, D-34, D-35, RBAC §3.2 and §5 (money-free views).

Tasks:
1. Migration 008 with bookings, booking_line_items, events, crew_members, event_crew_assignments, crew_unavailability, crew_pay_records tables (crew_pay_payments arrives in Phase 4 with expenses), plus bookings_ops_v and crew_event_v views.
2. Functions: convert_enquiry_to_booking, create_booking_from_quotation, assign_crew (conflict check against assignments and unavailability; override requires a reason and is stored), cancel_booking (invoices untouched). Pipeline creation with the 9 stages happens in booking creation; build the table in Phase 6 migration but create a minimal placeholder only if needed to keep Phase 3 green (document what you did).
3. Booking UI per UI_DESIGN_SPEC §8.3: list, detail with tabs (Overview, Events, Crew, Billing placeholder, Delivery placeholder, Documents placeholder, Activity), add/edit events, assign crew dialog with conflict warnings and override reason, cancel with reason and fee, status changes, internal booking confirmation document (PDF comes in Phase 5; stub the action).
4. Crew: directory, profile, optional link to a login user (Manager/Owner/SA), encrypted bank details (server-side only), availability calendar and unavailability entry, rate fields hidden from Staff/Crew via views.
5. Schedule page (/crm/schedule): month/week/day/list calendar, crew filter, event_type colours with text labels; crew users see only their own assignments via crew_event_v (no client contact details).
6. Role-aware booking views: ST and CR read bookings_ops_v only (no money columns).
7. RLS for all new tables and views; extend the matrix; own-record tests for crew.

Definition of Done: tests prove crew overlap and unavailability produce warnings and require override; override stored and audited; crew cannot read another crew member's booking (404/empty); staff and crew cannot see money columns; cancelling a booking leaves invoices unchanged; conversion is atomic (rollback test); RLS matrix green.
```

## Phase 4 — Finance (invoices, payments, receipts, credit notes, expenses, ledger)

```
PHASE 4: Finance. Branch phase-4-finance. Specs: DATABASE_SCHEMA §9 (migrations 009–010), BUSINESS_WORKFLOWS §2.4–§2.6, §3.6, §3.7, §3.11, §3.12, D-21, D-22, D-23, RBAC §3.3.

Tasks:
1. Migrations 009–010: invoices, invoice_items, credit_notes (+ items), payments, payment_allocations, receipts, expenses, manual_income_entries, crew_pay_payments; ledger_entries_v and invoices_v views; immutability triggers; allocation constraint triggers; block_mutation entries.
2. Functions: create_invoice, record_payment (row locks, full allocation, over-payment rejected, receipt number, status transitions), void_payment, reallocate_payment, issue_credit_note, cancel_invoice, record_crew_payment (creates the system expense atomically). Server Actions wrapping them.
3. Invoice UI per UI_DESIGN_SPEC §8.4: list with derived overdue highlight, builder (prefill from booking lines, advance invoices), detail with payments, receipts, credit notes; Record payment dialog with allocation list and the "Unallocated" meter; Void dialog with reason.
4. Payments list, receipts, credit notes pages. Expenses (categories, receipt upload to `expense-receipts`, soft delete, crew_payment category system-only). Manual income entries. Ledger page with filters, summaries, monthly chart, P&L report, CSV export with formula-injection protection. Crew pay records and payment dialog.
5. Dashboard financial widgets (hidden server-side for roles without finance access; DASH-09).
6. RLS and matrix for all new tables and views (Manager must not read payments or ledger_entries_v).

Definition of Done: integration tests prove: concurrent payments on one invoice never over-allocate; over-payment rejected; void restores balances and removes ledger income; paid invoice financial columns are immutable; payments/allocations/receipts/invoices cannot be deleted; credit note cannot exceed unpaid balance; ledger equals sum of its sources (financial integrity script F-01…F-08 from the Testing Plan implemented as tests/integration/finance-integrity.test.ts); crew payment creates exactly one linked expense; RLS matrix green.
```

## Phase 5 — PDF and Gmail

```
PHASE 5: PDF generation and Gmail. Branch phase-5-documents. Specs: DECISION_LOG D-03, D-10, D-27, D-28, BUSINESS_WORKFLOWS §3.14, §5.1, SECURITY_PLAN §4, §6; Integration Plan (patched) §2–§3.

Tasks:
1. lib/pdf: templates for quotation, invoice, receipt, credit note, booking confirmation. Embedded font with the ₹ glyph (verify rendering in a test that extracts text), branding from business_settings, Indian grouping, GST section only when applicable, VOID stamp for voided receipts, demo watermark when APP_MODE=demo. Route Handlers per document with signed-URL download (1 hour), `documents` bucket, `pdf_path` and staleness handling.
2. Gmail OAuth (Settings → Gmail): connect flow with state parameter, scopes gmail.send + openid + email, tokens encrypted with AES-256-GCM (key id stored), single-row gmail_credentials, show connected account, from name, reply-to, Test send, Disconnect (revoke at Google), Change account; status machine (connected / needs_reconnect / disconnected) with banners for SA and BO. Never hardcode an email address.
3. Email sending service: preview modal, idempotency key, MIME with PDF attachment, retry on 429/5xx, send log, activity entries, soft daily budget (400) with warnings; failure handling with PDF-download fallback; email_send_log writes; rate limit (20/hour/user).
4. Email templates: React Email layout + owner-editable subject/body with merge tags (sanitised), used for quotation, invoice, receipt, payment reminder, review request, invitation, password reset.
5. Wire Gmail into invitations and password resets (D-10), with the manual-link fallback when Gmail is not connected. Wire "Send" buttons for quotation, invoice, receipt, credit note.

Definition of Done: PDF smoke tests (extract text and assert number, client, totals, ₹); email send test with a mocked Gmail API proves idempotency (double-click sends once), failure fallback, and that tokens never appear in logs or client bundle; token encryption round-trip and key-id rotation test; OAuth callback validates state; change-account flow tested with mocks. Document the Google Cloud steps in docs/RUNBOOK_GMAIL.md (External, In production, redirect URIs, scopes).
```

## Phase 6 — Delivery pipeline

```
PHASE 6: Delivery pipeline. Branch phase-6-delivery. Specs: DATABASE_SCHEMA §10 (migration 011 delivery part), BUSINESS_WORKFLOWS §2.7, §3.9, D-36, UI_DESIGN_SPEC §8.5.

Tasks: delivery_pipelines, delivery_stages (9 stages from GLOSSARY §5), assignees, attachments (links and small files ≤ 50 MB to `client-uploads`), sequential completion trigger with SA/BO override, blocked reasons, behind-schedule derivation, tracker UI, share link with hashed token, expiry and revoke, public /delivery/[token] page with uniform "invalid or expired" response and rate limit, notifications for blocked stages, prompt for review request at stage 9, Staff can update only assigned stages, Crew read-only. Connect pipeline creation to booking creation (replace any Phase 3 placeholder).

Definition of Done: tests for sequential rule and override, blocked requires reason, staff-assigned rule, token page expiry/revoke/guessing, RLS matrix extended.
```

## Phase 7 — Public website

```
PHASE 7: Public website. Branch phase-7-website. Specs: UI_DESIGN_SPEC §7.1, D-08, D-11, D-29, D-38, SECURITY_PLAN §10.2, requirement modules WEB, SEO, MOB.

Tasks: public layout, home, portfolio (+category, lightbox, lazy loading, alt text enforced), services and pricing from catalogue (`show_on_website`), about, contact with the enquiry form (Zod, honeypot, Turnstile, consent checkbox stored as consent_given_at, rate limit 5/hour/IP) via POST /api/public/enquiry → enquiries row only, thank-you page, reviews page, faq/privacy/terms from site_content, cookie banner, sitemap.xml, robots.txt, JSON-LD (LocalBusiness, Review aggregate), per-page SEO from site_page_seo, Open Graph. Website content and SEO settings pages in the CRM. Public storage buckets `portfolio` and `branding`. Portfolio management in CRM (/crm/portfolio) with the consent-confirmation requirement to publish.

Definition of Done: Lighthouse CI on public pages meets D-41 targets (performance ≥ 85 mobile, SEO ≥ 90, accessibility ≥ 90); form tests (honeypot, Turnstile failure, rate limit, validation); no anonymous table policies exist; unpublished/unconsented portfolio items are never public.
```

## Phase 8 — Reviews and website content

```
PHASE 8: Reviews. Branch phase-8-reviews. Specs: DATABASE_SCHEMA §10 (review_requests, reviews), BUSINESS_WORKFLOWS §2.8, §3.10, D-37, UI_DESIGN_SPEC prompts 15.

Tasks: generate_review_request and submit_review functions (hashed 30-day tokens, one review per booking, new link revokes the previous), /review/[token] page (overall + communication + quality + punctuality, testimonial ≥ 10 chars, display name), moderation UI (approve, reject, re-hide to pending), notifications to BO/SA, review_stats_v, public /reviews and homepage carousel from approved reviews only, aggregate rating JSON-LD, send review link by Gmail.

Definition of Done: token expiry/replay/guess tests; duplicate submission blocked; only approved reviews public; Manager can request but not moderate (RBAC R6).
```

## Phase 9 — Dashboard, notifications, jobs, and Data management

```
PHASE 9: Dashboard completion, notifications, scheduled jobs, and Data management (setup mode, sample data, reset). Branch phase-9-ops. Specs: UI_DESIGN_SPEC §8.1, §7.4, BUSINESS_WORKFLOWS §3.2, §3.18, §4, §5.2, DECISION_LOG D-43, SECURITY_PLAN §12.5, DATABASE_SCHEMA §12 (reset functions).

Tasks:
1. Dashboard: all KPI cards, charts (collected vs invoiced revenue, booking mix), upcoming events, recent enquiries, overdue invoices, blocked stages, follow-ups due; widgets filtered on the server by role (RBAC §3.4); date-range selector with Indian financial year; 5-minute refresh; every widget links to the filtered list.
2. Notifications: all triggers in BUSINESS_WORKFLOWS §5.2, bell dropdown, mark read.
3. Vercel Cron routes protected by CRON_SECRET: daily digest 09:00 IST, expiry sweep, quotation expiry reminder, demo reset (demo only). vercel.json.
4. DATA MANAGEMENT (SA only) at /admin/system/data, linked from Settings:
   a. Migration: setup_mode and setup_locked_at on business_settings; is_sample columns on the tables listed in DATABASE_SCHEMA; functions app.reset_business_data, app.lock_setup, app.load_sample_data (service role only, transaction-local flag honoured by block_mutation triggers, refusal rules from D-43).
   b. Setup checklist (studio profile, branding, Gmail, catalogue, crew, first client) with progress.
   c. Load sample data (setup mode or demo only): synthetic "Lumina Studio" dataset with relative dates, clearly invalid phone numbers (+91 00000 001XX), @demo.email addresses, tagged is_sample.
   d. Reset wizard exactly as UI_DESIGN_SPEC Prompt 21: scopes with dependency auto-selection (Clients and dependants; Finance only; Crew; Catalogue; Portfolio and website content; Notifications and activity; Sample data only), options (restart numbering, also clear audit log in setup mode only), dry run with row counts and file list, mandatory pre-reset CSV zip export stored in `documents` and downloadable (abort if export fails), password re-entry, typed phrase RESET VOWS DATA, aal2 required, one transaction, storage cleanup for removed rows, `data_reset` audit entry, notifications.
   e. NEVER touched by reset: profiles/users, business_settings, email_templates, expense_categories, Gmail connection, document_number_config.
   f. Lock setup: typed confirmation, irreversible in the app, writes `setup_lock` audit entry. After lock, reset and sample loading are disabled in production with an explanatory message; demo mode keeps them enabled.
   g. Add supabase/break-glass/reset.sql with a heavily commented, manual-only procedure (not callable from the app) as described in SECURITY_PLAN §12.5.
5. Anonymise client function (SECURITY_PLAN §10.5) and SA action.

Definition of Done: tests prove reset is refused for non-SA, without aal2, with wrong phrase, after Lock setup (production), and that it succeeds in setup mode; dry-run counts equal actual deletions; failed export aborts with nothing deleted; users/settings/templates/categories/Gmail/numbering config survive; numbering restarts when requested; audit entries exist and are not deleted unless the option is chosen; sample loader tags only sample rows and the Sample scope removes exactly them; after reset the owner can create a client, quotation, booking, invoice and payment manually (E2E). Dashboard widgets are role-filtered (manager sees no revenue).
```

## Phase 10 — Hardening, testing, demo and deployment

```
PHASE 10: Hardening and release. Branch phase-10-release. Specs: SECURITY_PLAN (all, esp. §15, §16), 08_TESTING_PLAN (patched), 06_PORTFOLIO_CLONE_PLAN (patched), D-31, D-32, D-41, D-42.

Tasks:
1. Complete the automated suites: RLS matrix for every table, financial integrity, numbering, money, security tests in SECURITY_PLAN §15 (service-role key absent from client bundle, token never in logs/bundle, header/CSP check, upload abuse, XSS/SQL probes, CSV injection, rate limiting, lockout, token pages). Playwright E2E for the six flows in the Testing Plan, run as the correct roles.
2. Performance and accessibility pass against D-41 targets; fix findings. Responsive review at 375/768/1280.
3. Demo environment: same repo, separate Supabase and Vercel projects (D-32), APP_MODE=demo + boot guard, MFA bypass only on exact match, demo banner and PDF watermark, demo accounts panel on the login page, weekly reset cron, Gmail and invitations disabled, seed via the same sample loader.
4. Backups: nightly logical export job for critical tables to external storage (document the target), restore drill script and docs/RUNBOOK_RESTORE.md; storage export instructions.
5. Documentation: README, docs/RUNBOOK_DEPLOY.md (Vercel Pro, Supabase Pro, env vars, Auth settings, hook, cron, Turnstile, Upstash, Google Cloud), docs/RUNBOOK_SECURITY.md (secrets rotation, break-glass, incident response), docs/USER_GUIDE.md (short owner guide: setup mode → load/reset data → lock setup → daily workflows).
6. Final checklist: tick every item in SECURITY_PLAN §16 with evidence (test names or screenshots) in docs/RELEASE_CHECKLIST.md; list anything that cannot be verified from code and needs a human (legal review, DPDP, third-party RLS review, restore drill).

Definition of Done: CI fully green; release checklist complete; demo deployed and verified with the demo checklist; no TODOs remain; PROGRESS.md shows all phases done.
```

---

# Part C — Resume Prompt (use after a quota stop or new session)

```
Resume work on VOWS Studio. First paste-read the Master Prompt rules (you have them above). Then:
1. Read /PROGRESS.md and `git log --oneline -20` and `git status`.
2. Run `npm run lint && npm run typecheck && npm run test`. Report failures before doing anything else.
3. Identify the first unfinished task of the current phase, restate it in one sentence, and continue from there. Do not redo completed tasks. Do not start a new phase.
4. Keep committing after every task and updating /PROGRESS.md.
```

# Part D — Review prompt (use between phases if you want an independent check)

```
Act as an independent reviewer. Do not write new features. For phase N just completed:
1. Compare the implementation to the specified documents and list every deviation (file, requirement, what differs).
2. Check security: any use of the service-role client outside D-12; any table without RLS; any money arithmetic outside lib/money; any mutation path that skips requirePermission; any secret in code or logs.
3. Check the Definition of Done items one by one with test names as evidence.
4. Output a table: Item | Status (pass/fail/missing) | Evidence | Fix needed. Do not fix anything unless I say so.
```
