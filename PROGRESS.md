# VOWS Studio — Implementation Progress

> **Last Updated:** 2026-11-11  
> **Target:** Google Antigravity with Gemini 3.8  
> **Status:** 100% Complete — Ready for Production Release  

---

## Overall Roadmap Status

| Phase | Description | Status | Commit / Checkpoint |
|---|---|---|---|
| **Task 0** | Reconcile Documents 01–08 | **DONE** | `docs: reconcile documents 01-08` |
| **Phase 0** | Project Foundation & Tooling | **DONE** | Branch `phase-0-foundation` |
| **Phase 1** | Identity, Roles, RLS Foundation | **DONE** | Branch `phase-1-auth` |
| **Phase 2** | Settings, Catalogue, Clients, Enquiries, Quotations | **DONE** | Branch `phase-2-sales` |
| **Phase 3** | Bookings, Events, Crew, Schedule | **DONE** | Branch `phase-3-bookings` |
| **Phase 4** | Finance (Invoices, Payments, Receipts, Credits, Expenses, Ledger) | **DONE** | Branch `phase-4-finance` |
| **Phase 5** | PDF Generation & Gmail Integration | **DONE** | Branch `phase-5-documents` |
| **Phase 6** | Delivery Pipeline (9 Stages) | **DONE** | Branch `phase-6-delivery` |
| **Phase 7** | Public Website & Monograph Showcase | **DONE** | Branch `phase-7-website` |
| **Phase 8** | Reviews & Testimonials | **DONE** | Branch `phase-8-reviews` |
| **Phase 9** | Dashboard Completion, Jobs, Data Management (Reset Wizard) | **DONE** | Branch `phase-9-ops` |
| **Phase 10** | Hardening, Security Audits, Demo Hardening, Runbooks & Release | **DONE** | Branch `phase-10-release` |

---

## Task 0 Checklist (Reconciliation)
- [x] Apply global replacements to documents 01–08
- [x] Apply numbered patches from RECONCILIATION_PATCHES.md
- [x] Insert reconciliation banners under titles of documents 01–08
- [x] Generate `docs/RECONCILIATION_REPORT.md`
- [x] Create `/PROGRESS.md` and `/docs/OPEN_QUESTIONS.md`
- [x] Commit: `docs: reconcile documents 01-08`

---

## Phase 0 Checklist (Foundation)
- [x] Task 1: Scaffold Next.js 16 (TypeScript strict, App Router, Tailwind v4, ESLint) at repository root with D-07 layout (no `src/`). Add `proxy.ts` stub.
- [x] Task 2: Install and configure core packages (shadcn/ui, Radix, Zod, @supabase/ssr, TanStack Query, @react-pdf/renderer, @upstash/ratelimit, date-fns, Vitest, Playwright, React Email, lucide-react).
- [x] Task 3: Design system: tokens from UI_DESIGN_SPEC §2 as CSS variables, Inter + Cormorant Garamond fonts, base components gallery `/dev/components`.
- [x] Task 4: `lib/money`: pure functions with exhaustive unit tests (100% coverage).
- [x] Task 5: `lib/utils`: IST date helpers, FY helper, phone E.164, token generator + SHA-256 hash helper, AES-256-GCM encrypt/decrypt with tests.
- [x] Task 6: Env validation module (Zod) using GLOSSARY §9 names; boot guard for APP_MODE vs ALLOWED_SUPABASE_PROJECT_REF (D-32) with tests.
- [x] Task 7: Supabase CLI project in `/supabase` (config.toml, migrations, seed, tests, scripts: `db:reset`, `db:test`, `types:generate`).
- [x] Task 8: CI workflows (GitHub Actions, pinned SHAs): lint, typecheck, unit tests, integration job (`supabase start`), npm audit, secret scan.
- [x] Task 9: Security headers and nonce-based CSP in next.config / proxy per SECURITY_PLAN §7.1.
- [x] Task 10: README with local setup, env table, scripts, and branching model.

---

## Phase 1 Checklist (Identity, Roles, RLS Foundation)
- [x] Task 1: Migrations 001 (enums), 002 (helpers, schema `app`), 003 (identity & audit tables).
- [x] Task 2: Custom Access Token Hook for top-level JWT `user_role` claim.
- [x] Task 3: Triggers: `touch_updated_at`, `profile_role_guard`, `last_owner_guard`, `audit_trigger` (with secret stripping), `block_mutation` on `audit_log`, `log_auth_event`.
- [x] Task 4: First `system_admin` bootstrap script (`scripts/create-first-admin.ts`) with refusal guard.
- [x] Task 5: Auth Server Actions: `loginAction` (with lockout check & generic error), `logoutAction` (POST), `forgotPasswordAction`, `resetPasswordAction`, invitation actions (`inviteUserAction`, `resendInvitationAction`, `revokeInvitationAction`, `acceptInvitationAction`).
- [x] Task 6: MFA TOTP flows (`/mfa/enroll` with recovery handling, `/mfa` challenge). Enforced for SA & BO.
- [x] Task 7: `proxy.ts`: Session refresh, role claim verification, mandatory MFA level enforcement, RBAC §6 route matrix, landing pages per role, 403 on denied roles.
- [x] Task 8: `lib/auth`: `getAuthenticatedUser()`, `requirePermission()`, `lib/constants/permissions.ts` generated from RBAC §3, `ActionResult<T>` type and error codes.
- [x] Task 9: Immediate session revocation on role change, deactivation, password reset, and MFA reset.
- [x] Task 10: Rate limiting wrapper (Upstash) with tiers from SECURITY_PLAN §7.2, Turnstile verification helper, dev fallback.
- [x] Task 11: Admin pages (SA only): `/admin/dashboard`, `/admin/users`, `/admin/audit-log`. Business Owner scoped audit view at `/crm/audit-log`. Self-profile pages.
- [x] Task 12: RLS policies (migration 014 part 1) and test harness (`tests/integration/rls/rls-matrix.test.ts`).
- [x] Task 13: Auth screens per UI_DESIGN_SPEC §7.2 and CRM shell (`app/crm/layout.tsx` with sidebar, topbar, mobile nav, notification polling, theme toggle, 403/404/500 pages).

---

## Phase 2 Checklist (Settings, Catalogue, Clients, Enquiries, Quotations)
- [x] Task 1: Migrations 004–007, seed data, and `app.next_document_number()` with FY rollover logic & concurrency safety.
- [x] Task 2: Settings pages: studio profile, branding, billing and GST (audited gst_toggle), document numbering, email templates, expense categories, quotation templates.
- [x] Task 3: Catalogue: services and packages with price history (`effective_from`), archive, `show_on_website`, CSV import, current-price views.
- [x] Task 4: Clients: child tables for phones (max 3) and emails (max 2), duplicate detection, activity feed, soft delete, formula-injection safe CSV export.
- [x] Task 5: Enquiries: manual create, list/kanban toggle, explicit state machine transitions, follow-ups, lost reasons, link client action.
- [x] Task 6: Quotations: builder UI per UI_DESIGN_SPEC §8.2, live totals via `lib/money`, server recompute, versioning drawer, acceptance/rejection actions.
- [x] Task 7: Deferred constraint triggers (sum checks) and money CHECKs on quotations.
- [x] Task 8: RLS policies (migration 014 part 2) and extended RLS test matrix.
- [x] Task 9: Dashboard skeleton page (`/crm/dashboard`) with enquiry and quotation widgets.

---

## Phase 3 Checklist (Bookings, Events, Crew, Schedule)
- [x] Task 1: Migration 008 (tables: bookings, booking_line_items, events, crew_members, event_crew_assignments, crew_unavailability, crew_pay_records, delivery_pipelines, delivery_stages) & views `bookings_ops_v`, `crew_event_v`.
- [x] Task 2: Conflict detection function `check_crew_conflicts()` and assignment function `assign_crew()` enforcing D-34 override invariants.
- [x] Task 3: Automatic delivery pipeline initialization `init_booking_delivery_pipeline()` on booking creation.
- [x] Task 4: Booking conversion functions (`convert_enquiry_to_booking`, `create_booking_from_quotation` copying lines BK-10).
- [x] Task 5: Booking cancellation function `cancel_booking()` requiring reason and preserving invoices per D-35.
- [x] Task 6: RLS policies (migration 016) enforcing role separation: Staff & Crew read through views, direct table access denied.
- [x] Task 7: Sensitive crew bank account encryption via AES-256-GCM; decrypted server-side only for SA/BO.
- [x] Task 8: Server actions for bookings, events, and crew management with role-based money hiding.
- [x] Task 9: Booking List (`/crm/bookings`) and Detail (`/crm/bookings/[id]`) matching Stitch designs with 5 tab views, add event modal, crew assignment modal with conflict detection, and cancellation dialog.
- [x] Task 10: Standalone Booking Builder (`/crm/bookings/new`) with client picker, dynamic lines, and auto-computed totals.
- [x] Task 11: Crew Directory (`/crm/crew`) and Profile (`/crm/crew/[id]`) with metrics, discipline filter, blackout date management, and assignment history.
- [x] Task 12: Production Schedule Calendar (`/crm/schedule`) matching Stitch designs with month/week/list views, ceremony type legend, crew filtering, and anti-poaching client masking.
- [x] Task 13: Unit and integration tests covering scheduling conflicts, quotation conversion, cancellation invariants, and RLS matrix (168 tests, 100% coverage on validations and money).

---

## Phase 4 Checklist (Finance, Billing & Ledger)
- [x] Task 1: Migrations 009, 010, 017 for invoices, invoice_items, credit_notes, payments, payment_allocations, receipts, expenses, manual_income_entries, and `ledger_entries_v`.
- [x] Task 2: Core financial functions: `record_payment()`, `void_payment()`, `issue_credit_note()`, `cancel_invoice()`, and `record_crew_payment()`.
- [x] Task 3: Zero-drift money model: strictly integer paise (`bigint`), BigInt arithmetic in `lib/money`, D-16/D-17 invariants, immutable payment ledger.
- [x] Task 4: UI components matching Stitch screens: `InvoicesTable`, `InvoiceBuilder`, `InvoiceDetailView`, `PaymentsTable`, `RecordPaymentDialog`, `CreditNotesTable`, `ExpensesManager`, `ReceiptsTable`, `LedgerView`.
- [x] Task 5: CRM Finance pages: `/crm/invoices`, `/crm/invoices/new`, `/crm/invoices/[id]`, `/crm/payments`, `/crm/receipts`, `/crm/credit-notes`, `/crm/expenses`, `/crm/ledger`.
- [x] Task 6: Financial integrity test harness `tests/integration/finance-integrity.test.ts` (F-01 through F-08).

---

## Phase 5 Checklist (PDF Generation & Gmail Integration)
- [x] Task 1: Embedded Carlito fonts (`Carlito-Regular.ttf`, `Carlito-Bold.ttf`) with official `₹` glyph, registered via `lib/pdf/font-registry.ts`.
- [x] Task 2: Pure `@react-pdf/renderer` v4 templates: Quotation, Invoice, Receipt (with VOID stamp support), Credit Note, and Booking Confirmation.
- [x] Task 3: Document stream route handler `/api/pdf/[type]/[id]` delivering binary PDF downloads with permission checks.
- [x] Task 4: Gmail OAuth: connect route `/api/auth/gmail/connect`, callback route `/api/auth/gmail/callback`, AES-256-GCM token encryption (`GOOGLE_TOKEN_ENCRYPTION_KEY`).
- [x] Task 5: Gmail transmission service `email.service.ts` with RFC 2822 base64 MIME, PDF attachment stream, idempotency checking, daily budget limit (400), and exponential backoff.
- [x] Task 6: Branded React Email templates for all document types and notifications (`emails/`).
- [x] Task 7: Google Cloud runbook `docs/RUNBOOK_GMAIL.md`.
- [x] Task 8: Unit and integration tests for PDF rendering with text extraction and `₹` verification, OAuth state validation, token encryption, and MIME assembly (220 tests).

---

## Phase 6 Checklist (Delivery Pipeline)
- [x] Task 1: Database Migrations 011 and 018:
  - Canonical 9 delivery stages from GLOSSARY §5.
  - Database trigger `fn_check_delivery_stage_sequential`: enforces strict sequential progression.
  - Database trigger `fn_auto_init_booking_delivery`: automatically seeds 9 stages when booking is created.
- [x] Task 2: Domain types `types/delivery.ts`, database types `types/database.ts`, and Zod schemas `lib/validations/delivery.schema.ts`.
- [x] Task 3: Server Actions (`server/actions/delivery.actions.ts`).
- [x] Task 4: UI Components matching Stitch screens (`PipelineTracker`, `StageDialog`, `ShareLinkDialog`, `ReviewRequestPromptDialog`).
- [x] Task 5: CRM Operations Delivery Page `/crm/delivery/page.tsx` and Booking Detail View integration.
- [x] Task 6: Public Client Share Portal `/delivery/[token]/page.tsx`.
- [x] Task 7: Unit & Integration tests (258 total tests passing; 100% test coverage on `lib/money/**` and `lib/validations/**`).

---

## Phase 7 Checklist (Public Website & Monograph Showcase)
- [x] Task 1: Database Migrations 012 and 019 (`portfolio_items`, `portfolio_images`, `check_portfolio_consent_to_publish`, RLS).
- [x] Task 2: Types & Validations (`types/portfolio.ts`, `lib/validations/website.schema.ts`).
- [x] Task 3: API Route Handler `POST /api/public/enquiry` with rate limiting, honeypot, Turnstile validation, and consent logging.
- [x] Task 4: Server Queries & Actions for portfolio items, site content, FAQs, page SEO.
- [x] Task 5: Public Layout & Shared Components (`PublicHeader`, `PublicFooter`, `CookieBanner`, `PortfolioLightbox`, `LocalBusinessJsonLd`).
- [x] Task 6: Public Pages (`/`, `/portfolio`, `/services`, `/about`, `/contact`, `/reviews`, `/faq`, `/privacy`, `/terms`, `sitemap.ts`, `robots.ts`).
- [x] Task 7: CRM Portfolio Manager (`/crm/portfolio`) and Website Settings (`/crm/settings/website`).
- [x] Task 8: Quality Gates & Tests (284/284 tests passing, clean build across all 55 routes).

---

## Phase 8 Checklist (Reviews & Testimonials)
- [x] Task 1: Database Migration 013 and 020 (`review_requests`, `reviews`, `review_stats_v`, triggers).
- [x] Task 2: Types & Validation Schemas (`types/reviews.ts`, `lib/validations/reviews.schema.ts`).
- [x] Task 3: Server Actions & Integrations (`generateReviewRequestAction`, `submitReviewAction`, `moderateReviewAction` enforcing RBAC R6 ruling).
- [x] Task 4: Public Submission UI (`/review/[token]`).
- [x] Task 5: CRM Review Moderation Interface (`/crm/reviews`).
- [x] Task 6: Delivery & Booking Integrations.
- [x] Task 7: Quality Gates & Tests (318/318 tests passing, clean build across all 56 routes).

---

## Phase 9 Checklist (Dashboard, Notifications, Jobs, and Data Management)
- [x] Task 1: Database Migration 021 (`20261110000021_data_management.sql`):
  - Added `setup_mode` (default `true`) and `setup_locked_at` to `business_settings`.
  - Added `is_sample` (default `false`) across all tenant entity tables.
  - Stored procedures: `app.lock_setup()`, `app.anonymise_client(client_id, actor_id)`, `app.reset_business_data(scopes, restart_numbering, clear_audit, actor_id)`, and `app.load_sample_data(actor_id)`.
  - Immutability trigger bypass guard: `fn_block_mutation` honours `current_setting('app.reset_in_progress', true) = 'on'`.
  - Break-glass procedure: `supabase/break-glass/reset.sql` with documented dependency-order wipes and sequence reset.
- [x] Task 2: Data Management Console (`/admin/system/data`):
  - Client component `components/admin/data-management-view.tsx` matching Stitch screens `data_management_reset_wizard_step_1_desktop` and `reset_wizard_dry_run_safety_verification_desktop`.
  - Setup Mode status card with Tenancy Schema Guard and Go-Live lock state.
  - First-Run Setup Checklist (6 items: profile, branding, Gmail, catalogue, crew, client) with live progress bar.
  - Load Sample Data action (allowed only in Setup Mode or Demo Mode).
  - Permanent Lock Setup modal requiring confirmation phrase `LOCK SETUP`.
  - DPDP Client Anonymisation tool (`anonymiseClientAction`) preserving financial invoices.
  - Full 4-step Reset Wizard Modal:
    - Step 1: Target partition checkboxes with dependency cascade information.
    - Step 2: Live dry-run simulation table with record and file counts.
    - Step 3: Safety verification with pre-reset backup archive download, SuperAdmin password verification, exact confirmation phrase `RESET VOWS DATA`, and safeguard checkboxes.
    - Step 4: Completion summary with backup reference and execution timestamp.
- [x] Task 3: Executive Dashboard Completion (`/crm/dashboard`):
  - Complete role-based filtering:
    - SA & Business Owner: full financial briefing, revenue velocity, collected vs invoiced charts, overdue invoices widget.
    - Accountant: financial ledger figures and invoice tracking without operations management.
    - Manager: Operations metrics ONLY (active enquiries, confirmed bookings, upcoming events, blocked stages, total clients, follow-ups due) with **strictly zero revenue or financial amounts** per RBAC R3 ruling.
    - Staff / Crew: assigned schedule and delivery milestones.
  - Indian Financial Year selector dropdown (April 1 to March 31, e.g. FY 2025-26).
  - 5-minute auto-refresh interval with last-synced timestamp and manual refresh trigger.
  - Booking composition donut chart and 6-month revenue SVG chart.
  - Active interactive widgets linking to CRM filtered lists.
- [x] Task 4: Notifications & Bell Dropdown:
  - Unread count badge and auto-polling every 60 seconds in CRM topbar.
  - Dropdown listing recent notifications with relative timestamps.
  - "Mark All Read" action (`markAllNotificationsReadAction`) and click-to-navigate.
- [x] Task 5: Scheduled Background Jobs (Vercel Cron & `vercel.json`):
  - `/api/cron/daily-digest`: `30 3 * * *` (09:00 IST) — scans follow-ups and overdue invoices.
  - `/api/cron/expiry-sweep`: `30 20 * * *` (02:00 IST) — cleans expired share links and stale invites.
  - `/api/cron/quotation-expiry`: `30 3 * * *` (09:00 IST) — alerts creators of quotations expiring in 3 days.
  - `/api/cron/demo-reset`: `0 2 * * 0` (Sunday 02:00 UTC) — refreshes demo instance dataset.
  - All cron endpoints protected by `CRON_SECRET` bearer check.
- [x] Task 6: Verification & Quality Gates:
  - Unit tests: `tests/unit/data-management/reset-wizard.test.ts`, `tests/unit/dashboard/role-filtering.test.ts`, `tests/unit/cron/cron-jobs.test.ts`.
  - 353 / 353 tests passing; 100% coverage on `lib/money/**` and `lib/validations/**`.
  - Production build successful across 62 routes.

---

## Phase 10 Checklist (Hardening, Security Audits, Demo Hardening, Runbooks & Release)
- [x] Task 1: Automated Security & Hardening Suites (`tests/unit/security/`):
  - `bundle-secrets.test.ts`: Verifies service-role key and secrets are never prefixed with `NEXT_PUBLIC_` or exposed to client bundle.
  - `headers-csp.test.ts`: Verifies `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, Referrer-Policy, Permissions-Policy, and Content Security Policy (`frame-ancestors 'none'`, `object-src 'none'`).
  - `csv-formula-injection.test.ts`: Verifies `lib/utils/csv.ts` neutralizes formula injection payloads (`=`, `+`, `-`, `@`, `\t`, `\r`) in CSV exports.
  - `upload-abuse.test.ts`: Verifies file upload validation in `lib/validations/upload.ts` (oversized files, disallowed MIME types, double extensions, SVG script injection).
  - `xss-sqli-probes.test.ts`: Verifies free-text fields and quotation/review schemas withstand XSS and SQL injection payloads safely.
- [x] Task 2: Demo Mode Hardening:
  - `NEXT_PUBLIC_APP_MODE === 'demo'` banner displayed across CRM shell.
  - Quick-fill demo credentials panel on `/login` for all 4 core roles.
  - `DEMO PREVIEW` watermark stamped on all quotation and invoice PDFs when generated in demo mode.
- [x] Task 3: Comprehensive Documentation & Operational Runbooks:
  - `docs/RUNBOOK_RESTORE.md`: Dual-tier backup schedules, step-by-step scratch restoration drill, sequence counter reset, and financial ledger integrity verification.
  - `docs/RUNBOOK_DEPLOY.md`: Complete guide for Vercel Pro and Supabase Pro deployment, environment variables reference table, Auth settings, Google Cloud OAuth, Upstash Redis, and Cloudflare Turnstile.
  - `docs/RUNBOOK_SECURITY.md`: Secret rotation protocols, break-glass SQL usage (`supabase/break-glass/reset.sql`), P0/P1 incident response checklists, and DPDP notification procedures.
  - `docs/USER_GUIDE.md`: Comprehensive owner manual covering setup mode, catalogue & crew onboarding, sample data, lock setup, sales workflows, delivery pipeline, invoicing, and review moderation.
  - `docs/RELEASE_CHECKLIST.md`: Formal verification audit against every requirement in `SECURITY_PLAN.md` §16, citing exact test names, files, and human sign-offs.
- [x] Task 4: Final Quality Gates & Verification:
  - ESLint: 0 errors
  - TypeScript: 0 errors (`tsc --noEmit`)
  - Vitest: 375 / 375 tests passing (37 test suites)
  - Statement & Line Coverage: 100% on `lib/money/**` and `lib/validations/**`
  - Next.js Production Build: 62 static and dynamic routes compiled successfully in Turbopack
