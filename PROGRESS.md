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
| **Phase 2** | Settings, Catalogue, Clients, Enquiries, Quotations | **DONE** | Branch `phase-2-sales` |
| **Phase 3** | Bookings, Events, Crew, Schedule | **DONE** | Branch `phase-3-bookings` |
| **Phase 4** | Finance (Invoices, Payments, Receipts, Credits, Expenses, Ledger) | **DONE** | Branch `phase-4-finance` |
| **Phase 5** | PDF Generation & Gmail Integration | **DONE** | Branch `phase-5-documents` |
| **Phase 6** | Delivery Pipeline (9 Stages) | **DONE** | Branch `phase-6-delivery` |
| **Phase 7** | Public Website | **DONE** | Branch `phase-7-website` |
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
  - Canonical 9 delivery stages from GLOSSARY §5: `raw_import`, `culling`, `editing`, `client_preview`, `revisions`, `final_export`, `quality_check`, `delivery`, `completed`.
  - Override auditing: `override_reason`, `overridden_by`, `overridden_at` on `delivery_stages`.
  - Stage assignees table: `delivery_stage_assignees` with staff assignment policy.
  - Deliverables & attachments table: `delivery_stage_attachments` (links & files ≤ 50MB to `client-uploads`).
  - Database trigger `fn_check_delivery_stage_sequential`: enforces strict sequential progression; allows SA/BO override only with non-empty reason; requires blocked reason; sets `pipeline.completed_at` on stage 9 without altering booking status (D-36, DEL-03).
  - Booking trigger `fn_auto_init_booking_delivery`: automatically seeds 9 stages when booking is created.
  - View `delivery_pipelines_v`: derived `behind_schedule`, progress %, current stage code.
  - RLS policies: Staff can update ONLY assigned stages (`app.assigned_to_stage`); Crew is read-only.
- [x] Task 2: Domain types `types/delivery.ts`, database types `types/database.ts`, and Zod schemas `lib/validations/delivery.schema.ts` (100% test coverage).
- [x] Task 3: Server Actions (`server/actions/delivery.actions.ts`):
  - `getDeliveryPipelineAction`, `updateStageStatusAction`, `assignStageStaffAction`, `addStageAttachmentAction`, `deleteStageAttachmentAction`, `generateShareLinkAction`, `revokeShareLinkAction`, `getPublicDeliveryAction`, `listDeliveryPipelinesAction`.
- [x] Task 4: UI Components matching Stitch screens:
  - `PipelineTracker` (`components/delivery/pipeline-tracker.tsx`) with 9-stage stepper, progress metrics, behind-schedule alerts, and stage drawer.
  - `StageDialog` (`components/delivery/stage-dialog.tsx`) with status controls, blocked reason prompt, SA/BO override audit form, staff assignees, and attachment deliverables.
  - `ShareLinkDialog` (`components/delivery/share-link-dialog.tsx`) with 256-bit secure token generation, expiration windows, copy link toast, and revocation.
  - `ReviewRequestPromptDialog` (`components/delivery/review-request-prompt-dialog.tsx`) launched upon completing stage 9.
- [x] Task 5: CRM Operations Delivery Page `/crm/delivery/page.tsx` and integration into Booking Detail View Tab 3 ("Master Delivery").
- [x] Task 6: Public Client Share Portal `/delivery/[token]/page.tsx` with uniform "Invalid or expired delivery link" error handling, and media deliverables viewer.
- [x] Task 7: Unit & Integration tests (`tests/unit/delivery/sequential-stage.test.ts`, `tests/unit/delivery/share-token.test.ts`, and extended `tests/integration/rls/rls-matrix.test.ts`):
  - 258 total tests passing; 100% test coverage on `lib/money/**` and `lib/validations/**`.

---

## Phase 7 Checklist (Public Website & Monograph Showcase)
- [x] Task 1: Database Migrations 012 and 019:
  - `portfolio_items` and `portfolio_images` with DB constraint `check_portfolio_consent_to_publish` (`CHECK (NOT is_published OR client_consent_confirmed_at IS NOT NULL)`), indexes, and `app.touch_updated_at()` trigger.
  - Public storage buckets `portfolio` and `branding` created per GLOSSARY §10 & D-29.
  - Seeds for default curated wedding monographs, FAQ items, site content, and page SEO metadata.
  - Strict RLS policies: anonymous public access can read ONLY published portfolio items and images with confirmed client consent (`is_published = true AND client_consent_confirmed_at IS NOT NULL AND deleted_at IS NULL`). Internal roles (SA, BO, MG) can manage; Staff/Crew can read internal drafts in CRM.
- [x] Task 2: Types & Validations:
  - Domain types `types/portfolio.ts` (`PortfolioItem`, `PortfolioImage`, `SitePageSeo`, `FaqItem`).
  - Database types `types/database.ts` updated with `portfolio_items`, `portfolio_images`, `site_content`, `site_page_seo`, `faq_items`.
  - Zod validation schemas: `publicEnquirySchema` (phone E.164, mandatory consent, honeypot, Turnstile), `portfolioItemSchema` (enforces client consent timestamp when `isPublished: true`), `portfolioImageSchema` (min 5-character alt text), `updateSiteContentSchema`, `updateSitePageSeoSchema`, `faqItemSchema`.
  - 100% test coverage verified in `lib/validations/website.test.ts`.
- [x] Task 3: API Route Handler:
  - `POST /api/public/enquiry` (`app/api/public/enquiry/route.ts`):
    - Client IP rate limit (5 per hour per IP) via `checkRateLimit('public_form', ip)`.
    - Honeypot anti-spam trap returning silent 200 without DB insertion.
    - Cloudflare Turnstile token validation.
    - Inserts strictly into `enquiries` table with `consent_given_at` (no client row created per D-11, D-33, CLI-05).
- [x] Task 4: Server Queries & Actions:
  - Server Queries (`server/queries/website.queries.ts`): `getPublicPortfolioItems`, `getPublicServicesAndPackages`, `getPublicFaqItems`, `getPublicSiteContent`, `getPublicPageSeo`, `getPublicReviews`.
  - Server Actions (`server/actions/portfolio.actions.ts`): `listPortfolioItemsAction`, `createPortfolioItemAction`, `updatePortfolioItemAction`, `publishPortfolioItemAction` (enforces consent), `unpublishPortfolioItemAction`, `deletePortfolioItemAction`, `addPortfolioImageAction`, `deletePortfolioImageAction`.
  - Server Actions (`server/actions/website.actions.ts`): `getSiteContentAction`, `updateSiteContentAction`, `listFaqItemsAction`, `createFaqItemAction`, `updateFaqItemAction`, `deleteFaqItemAction`, `getSitePageSeoAction`, `updateSitePageSeoAction`.
- [x] Task 5: Public Layout & Shared Components:
  - `PublicHeader` (`components/public/public-header.tsx`): VOWS Studio monogram logo, nav links, "Studio Portal" sign-in link, "Enquire" CTA, and responsive mobile menu drawer.
  - `PublicFooter` (`components/public/public-footer.tsx`): Mangalore atelier address, South Goa atelier note, legal compliance links, copyright, DPDP notice.
  - `CookieBanner` (`components/public/cookie-banner.tsx`): subtle local-storage-persisted consent banner.
  - `PortfolioLightbox` (`components/public/portfolio-lightbox.tsx`): high-res image frame, caption details, tags, alt text, and keyboard navigation (Left, Right, Escape).
  - `LocalBusinessJsonLd` (`components/public/json-ld.tsx`): PhotographyBusiness and AggregateRating structured data.
- [x] Task 6: Public Pages:
  - Home (`app/(public)/page.tsx`): Hero, Trust Strip, Selected Monographs, Liturgical Nuptials philosophy, Signature Packages from catalogue, Kind Words testimonials, and Inscription CTA banner.
  - Portfolio (`app/(public)/portfolio/page.tsx` & `app/(public)/portfolio/[category]/page.tsx`): Category filter chips, responsive card grid, and lightbox.
  - Services & Pricing (`app/(public)/services/page.tsx`): Rate card, signature packages comparison with `formatINR`, modular production commissions, and turnaround SLAs.
  - About (`app/(public)/about/page.tsx`): Studio heritage narrative, Reuben Serrao's philosophy, natural light & chemical film craft, camera systems, archival vault.
  - Contact (`app/(public)/contact/page.tsx`): Studio coordinates, consultation protocol, and `PublicEnquiryForm`.
  - Thank You (`app/(public)/contact/thank-you/page.tsx`): Confirmation and 3-step consultation timeline.
  - Reviews (`app/(public)/reviews/page.tsx`): 4.9/5.0 aggregate rating card, category breakdowns, and verified couple review cards.
  - FAQ (`app/(public)/faq/page.tsx`), Privacy Policy (`app/(public)/privacy/page.tsx`), Terms of Service (`app/(public)/terms/page.tsx`).
  - Next.js SEO metadata routes: `app/sitemap.ts` and `app/robots.ts`.
- [x] Task 7: CRM Portfolio Manager & Website Settings:
  - `/crm/portfolio` (`app/crm/portfolio/page.tsx` and `portfolio-client.tsx`):
    - Manage portfolio monographs with live/draft status chips, consent status, and "+ Add New Project" modal.
    - `PortfolioConsentDialog` matching `stitch-screens/portfolio_manager_consent_dialog_desktop`: enforces 3-point DPDP publication consent release before setting `is_published = true`.
  - `/crm/settings/website` (`app/crm/settings/website/page.tsx` and `website-settings-client.tsx`):
    - Tabbed configuration for Homepage hero, Studio philosophy, FAQ items CRUD, page SEO metadata, and legal policies.
- [x] Task 8: Quality Gates & Tests:
  - `tests/integration/public-enquiry-form.test.ts` (7 tests covering honeypot, Turnstile failure, rate limiting, validation, consent confirmation, and portfolio DB constraint).
  - `tests/integration/rls/rls-matrix.test.ts` extended with Phase 7 portfolio visibility simulation.
  - 284/284 tests passing; 100% coverage on `lib/money/**` and `lib/validations/**`.
  - Clean ESLint (0 errors) and TypeScript typecheck (0 errors).
  - Production build successful across all 55 static and dynamic routes.
