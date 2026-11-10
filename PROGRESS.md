# VOWS Studio — Implementation Progress

> **Last Updated:** 2026-11-10  
> **Target:** Google Antigravity with Gemini 3.8  
> **Status:** Active Execution  

---

## Overall Roadmap Status

| Phase | Description | Status | Commit / Checkpoint |
|---|---|---|---|
| **Task 0** | Reconcile Documents 01–08 | **DONE** | `docs: reconcile documents 01-08` |
| **Phase 0** | Project Foundation & Tooling | **DONE** | Branch `phase-0-foundation` |
| **Phase 1** | Identity, Roles, RLS Foundation | **DONE** | Branch `phase-1-auth` |
| **Phase 2** | Settings, Catalogue, Clients, Enquiries, Quotations | Pending | Branch `phase-2-sales` |
| **Phase 3** | Bookings, Events, Crew, Schedule | Pending | Branch `phase-3-bookings` |
| **Phase 4** | Finance (Invoices, Payments, Receipts, Credits, Expenses, Ledger) | Pending | Branch `phase-4-finance` |
| **Phase 5** | PDF Generation & Gmail Integration | Pending | Branch `phase-5-documents` |
| **Phase 6** | Delivery Pipeline (9 Stages) | Pending | Branch `phase-6-delivery` |
| **Phase 7** | Public Website | Pending | Branch `phase-7-website` |
| **Phase 8** | Reviews & Testimonials | Pending | Branch `phase-8-reviews` |
| **Phase 9** | Dashboard Completion, Jobs, Data Management (Reset Wizard) | Pending | Branch `phase-9-ops` |
| **Phase 10** | Hardening, Release & Deployment Runbooks | Pending | Branch `phase-10-release` |

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
