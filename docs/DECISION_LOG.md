# VOWS Studio — Decision Log

> **Status:** Draft for review · **Date:** 2026-11-09 · **Companion:** `GLOSSARY_AND_ENUMS.md`
> **Purpose:** Settle every cross-document contradiction and open decision found in the documentation audit, so the six remaining documents (RBAC, Schema, ERD, Workflows, Security, UI) and the implementation start from one set of facts.
> **Precedence rule:** Where this log disagrees with documents 01–08, **this log wins**. Part G lists the edits each older document needs.

**Status legend**
- **Confirmed**: you answered or decided this directly.
- **Adopted**: Claude's recommendation from the audit, adopted on your go-ahead. Override any of these before the six documents are written.
- **Verify**: depends on an external fact to check at implementation time (see Part H).

---

## Part A — Confirmed by the business owner

### D-01 Role model — *Confirmed*
Six roles are kept: `system_admin`, `business_owner`, `manager`, `accountant`, `staff`, `crew_member` (Requirements AUTHZ-05 is the base matrix). The API/Architecture ladder (`manager/editor/viewer`) and the Roadmap/Testing set (`staff`, `crew_member`, `client_viewer`) are retired. `client_viewer` is dropped; a client portal is post-MVP.
- One role per user, no composite roles. `system_admin` is seeded only and cannot be created or escalated to through the app. `business_owner` and all other roles are created via invitation by `system_admin`.
- Roles stay in the model even when unused at first, so staff can be added later without schema changes.

### D-02 MFA — *Confirmed*
TOTP MFA is **mandatory for `system_admin` and `business_owner`** and optional for every other role. These two roles must reach `aal2` before any `/crm/*` or `/admin/*` page loads, and enrolment is forced at first login. Other roles see an "enable MFA" prompt at first login (AUTH-04) that can be dismissed.

### D-03 Gmail sender — *Confirmed* (facts verified 2026-11-10)
- Initial studio sender is the personal Gmail account `vowsbyreuben@gmail.com`. The address is **never hardcoded**; it is whatever account is connected in Settings.
- Settings provides: connected account (shown from the OAuth identity), From display name, optional Reply-To, **Disconnect**, and **Change account** (revoke old tokens → delete → new OAuth flow). Past emails keep their original sender in the send log.
- One connected sender per installation (Requirements GMAIL-04). Only `system_admin` and `business_owner` can connect or change it. Other roles with send permission use it but never see tokens.
- Google Cloud consent screen: user type **External** (Internal needs Google Workspace). Publishing status must be **In production**, because "Testing" status expires refresh tokens in about 7 days. Expect an "unverified app" warning on connect, which is acceptable for a single-owner tool (unverified clients are capped at 100 users). In production, refresh tokens persist until revoked, unused for about six months, or invalidated when the Google account password changes (Gmail scopes). All three land in the `needs_reconnect` state with a banner and PDF-download fallback.
- Scopes: `gmail.send` plus the non-sensitive `openid` and `email`, so the app can learn which account connected. `gmail.readonly` stays forbidden. This is a small amendment to GMAIL-01.
- Personal Gmail is capped at about **500 recipients per day**, shared across every way the account sends mail (Workspace: 2,000). The Gmail API allows 500 recipients per message. This is adequate for quotes, invoices and receipts. The app enforces a soft daily budget of 400 sends and warns the user near the cap.
- Redirect URIs are registered for `localhost` and the production domain only. Vercel preview URLs are dynamic, so the Gmail connect flow is used on production, localhost, or one fixed `dev` alias domain, not on arbitrary previews.

### D-04 Starting point — *Confirmed*
Greenfield: no data migration, no import tooling. Numbering starts at 1 (`QT-2026-000001`, since today falls in FY 2026–27). *Adopted default:* back-dated entry of past jobs is allowed (issue date may precede creation date) for the owner's own records. Numbers still follow creation order.

---

## Part B — Foundation and security

### D-05 Role storage and RLS — *Adopted*
`profiles.role` (Postgres enum `user_role`) is the source of truth, plus `profiles.is_active`. A Supabase **Custom Access Token Hook** (available on Free and Pro) copies the role into a **top-level JWT claim `user_role`** so RLS and the route-protection layer avoid a database lookup on every request. The hook is a plain (non-`SECURITY DEFINER`) Postgres function granted to `supabase_auth_admin`, revoked from `anon`/`authenticated`, with an RLS policy letting `supabase_auth_admin` read `profiles`. Hook claims appear in the access token only, so server code decodes the verified token to read them. RLS uses small `SECURITY DEFINER` helper functions (e.g. `auth_role()`, `has_role(...)`) to avoid policy recursion. Role change or deactivation triggers a global session revocation so it takes effect immediately instead of at the next token refresh. `user_metadata` is never used for authorization.
### D-06 Mutation surface — *Adopted*
- **Reads:** Server Components via the Supabase SSR client.
- **Authenticated mutations:** typed Server Actions that validate with Zod, check permission, then write. They return one `ActionResult<T>` shape (`{ data, error: { code, message, details? } }`, codes from the API error table).
- **Route Handlers only for:** public endpoints (enquiry form, review submit, public data), OAuth callbacks, file downloads (PDF/CSV), cron, and token pages.
- TanStack Query is used only for client-interactive lists. API Contracts (doc 04) is reduced to "Route Handler contracts" for these cases.

### D-07 Directory layout — *Adopted*
Root-level, **no `src/`**: `app/`, `components/`, `lib/`, `server/`, `types/`, `hooks/`, `supabase/`, `tests/`, `emails/`, `public/`. Under `lib/`: `supabase/`, `auth/`, `money/`, `validations/`, `pdf/`, `gmail/`, `constants/`, `utils/`. Server Actions live in `server/actions/` and shared queries in `server/queries/`. Tests live in `tests/{unit,integration,e2e}` and database tests in `supabase/tests/`. The Testing Plan's `src/` paths are corrected.

### D-08 Canonical routes — *Adopted*
- **Auth:** `/login`, `/mfa`, `/mfa/enroll`, `/forgot-password`, `/reset-password`, `/invite/[token]`; Route Handler `/auth/callback`. Logout is a POST Server Action. There is no signup.
- **Public:** `/`, `/portfolio`, `/portfolio/[category]`, `/services` (services and pricing together, per WEB-04), `/about`, `/contact` (hosts the enquiry form; `/contact/thank-you`), `/reviews`, `/faq`, `/privacy`, `/terms`, `/review/[token]`, `/delivery/[token]`, `sitemap.xml`, `robots.txt`.
- **CRM** (`/crm/...`): `dashboard`, `schedule` (calendar; crew landing page), `clients`, `enquiries`, `quotations`, `bookings`, `invoices`, `payments`, `ledger`, `expenses`, `crew`, `services`, `packages`, `delivery`, `portfolio`, `reviews`, `audit-log` (Business Owner's scoped view), `settings/*` (studio, branding, billing-gst, numbering, email-templates, gmail, expense-categories, website, plus a link to user management for SysAdmin).
- **Admin** (`/admin/...`, SysAdmin only): `dashboard`, `users`, `audit-log`, `system`.
- Removed: `/signup`, `/admin/tenants`, `settings/team` (replaced by `/admin/users`), separate `/enquiry` and `/pricing`.

### D-09 Auth parameters — *Adopted*
Password: minimum 12 characters with complexity (Requirements). Invitation token: single-use, **72 hours**. Password reset: 1 hour. Access token: 1 hour. Refresh token: 30 days inactivity (set in Supabase). Lockout: 5 failures in 15 minutes locks the account for 30 minutes, implemented in our own login Server Action with an `auth_attempts` table, because Supabase does not provide it. SysAdmin can unlock.

### D-10 Auth emails and invitations — *Adopted* (verified 2026-11-10)
Magic links stay disabled. To honour 72-hour expiry and keep **one email channel** (the connected Gmail), invitations use our own `invitations` table (hashed token, email, role, expires_at, used_at). On acceptance, the server creates the auth user with the admin API. Password reset uses the admin `generateLink` (recovery) and sends the link through the Gmail integration. If Gmail is not connected (for example during first bootstrap), the invite or reset link is shown to SysAdmin to copy and share manually. Supabase's link expiry is one project-wide setting (default 1 hour), so a 72-hour invitation would also lengthen recovery links. That is why invitations use our own table while recovery keeps the 1-hour default.

### D-11 Rate limiting and bot protection — *Adopted*
`@upstash/ratelimit` with Upstash Redis (Vercel Marketplace) on public endpoints, login and email sending, using the tiers in the API doc. Public enquiry and review forms use a honeypot field plus **Cloudflare Turnstile**. Public forms insert through a Route Handler using the service-role client after validation, so there is no anonymous insert policy.

### D-12 Service-role usage — *Adopted*
The service-role client is allowed only in: SysAdmin user operations, invitations/reset links, token pages, public form inserts, cron/background, PDF/storage operations, and token encryption paths. It is never used in middleware, never in Client Components, and never to read data on behalf of ordinary pages.

### D-13 Error semantics — *Adopted*
Role-level denial returns **403** (Requirements AUTHZ-06). A row hidden by "own records" RLS (for example a crew member opening someone else's booking ID) is indistinguishable from not found and returns **404**. This is a documented exception so IDs can't be probed.

### D-14 Delete semantics — *Adopted*
- Soft delete (`deleted_at`): clients, enquiries, draft quotations, confirmed bookings, expenses, services, packages, reviews, portfolio items.
- Never deleted: invoices, payments, receipts, credit notes, ledger sources, audit logs. They are cancelled, voided or corrected instead.
- Crew and users are deactivated, not deleted.
- Hard delete is SysAdmin-only, for non-financial data, with confirmation and an audit entry. Client erasure requests are handled by anonymising personal fields while keeping financial records for the retention period (design detail in SECURITY_PLAN).

### D-15 Audit mechanism — *Adopted*
Row-level database triggers write who/what/when and before/after JSON to `audit_log` (append-only, no UPDATE/DELETE policy for any role). `ip_address` and `user_agent` are mandatory for auth/security events and **best-effort** for data mutations (supplied by the financial database functions and Server Action wrapper). This amends AUDIT-02 from "must capture" to "where available". Secrets never appear in snapshots. Business Owner sees business-record entries only (not user-management or auth events); SysAdmin sees everything. Table name: `audit_log`.

---

## Part C — Data and finance

### D-16 Money — *Adopted*
- Amounts are integer **paise**, `bigint`, column suffix `_paise`. "Paise" is the canonical spelling; the `_paisa` names in GST-02 are superseded.
- Percentages and tax rates are integer **basis points**, suffix `_bps` (18% = 1800; fractions down to 0.01% allowed).
- Rounding is **round-half-up** to the paisa, computed as `floor((amount × bps + 5000) / 10000)` with overflow-safe integer arithmetic (BigInt where needed). Floats are never used for money. `lib/money` is the only module allowed to do monetary arithmetic.
- Quantity is an integer ≥ 1 in V1 (half-day style items are modelled as separate services). Moving to fractional quantities later needs a migration to hundredths, so confirm this is acceptable.
- Display uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` only in the presentation layer.

### D-17 Calculation order — *Adopted*
`line_total = unit_price × quantity` → `subtotal = Σ line_total` → overall **discount** (either `percent` in bps or `fixed` paise, one type per document, capped at subtotal) → **taxable base = subtotal − discount** → tax. Per-line discount (Roadmap/Testing) is **removed** in V1; Requirements QT-03 is canonical. When GST is on, the discount is apportioned across lines pro-rata using the largest-remainder method so paise add up exactly, tax is computed per rate slab, and CGST and SGST are each rounded separately then summed (FIN-04). The server recomputes everything on every save and rejects any client total that differs by even 1 paisa (FIN-06).

### D-18 GST scope — *Adopted*
Database columns and the calculation engine (with tests) are built from the start. All GST UI is hidden unless `business_settings.gst_enabled = true`. Clients get `state_code` and optional `gstin`; business GSTIN and HSN/SAC codes are configurable. This reconciles Brief S-17 with the Roadmap's "GST UI post-MVP".

### D-19 Document numbering — *Adopted*
Format `{PREFIX}-{FY}-{NNNNNN}`. **FY is the starting year of the Indian financial year (April–March), evaluated in IST.** Prefixes: `QT`, `INV`, `RCP`, `BK`, `CN` (credit note). Padding 6 (configurable, new documents only). Counters live in `document_sequences (doc_type, fy, last_value)` and are allocated with a single atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` inside the creating transaction, so numbers are unique, gap-free on commit and reset each FY. Numbers are assigned at creation and are immutable. Discarded drafts are cancelled or voided, never deleted, so numbers are never reused. Configuration (prefix, padding, FY start month) is SysAdmin-only (Requirements SET table).

### D-20 Quotation versioning — *Adopted*
One row per version in `quotations` (`root_id`, `version_no`, `is_current`) with child item rows per version. The display number is `QT-2026-000001` plus `v2`. Drafts edit in place. Editing a `sent` or `accepted` quotation creates a new version, and the older one becomes read-only/`superseded` (QT-05, QT-12). Invoices are not versioned (see D-22).

### D-21 Payments — *Adopted*
Allocation model: `payments` (client, amount, date, method, reference) plus `payment_allocations` (payment, invoice, amount). A payment must be fully allocated at creation. **Over-payment is blocked in V1** (no unallocated credit); advances are handled by issuing a deposit/advance invoice first, so a booking may have several invoices. Recording runs in one Postgres function that locks the invoice row (`FOR UPDATE`), checks the outstanding amount, inserts the payment and allocations, and updates invoice status atomically (INV-NFR-02). A trigger acts as a backstop, since "sum of allocations ≤ total" can't be a simple CHECK. Payments are **immutable**: correction means **void** (with reason, reversing allocations), never edit or delete. One receipt (`RCP`) per payment. The API's `PATCH/DELETE /payments` are replaced by a void action.

### D-22 Invoices and credit notes — *Adopted*
`draft` is freely editable. After `sent`, only notes and due date can change. Substantive changes to a sent invoice mean cancel and reissue if unpaid, or a **credit note** if any payment exists. Paid invoices are locked (INV-10). Credit notes are a new document type (`CN`), linked to the original invoice with their own items and PDF. This is added to Roadmap Phase 4, since no document had it.

### D-23 Ledger — *Adopted*
The ledger is a **database view** unioning non-voided `payments` (income), `manual_income_entries`, and non-deleted `expenses` (expense). There is no duplicate `ledger_entries` table, so the ledger cannot drift from its sources (it removes the risk behind test F-06). Crew payments create `expenses` rows (category `crew_payment`, `crew_pay_id` FK) in the same transaction as the pay record, and that category cannot be created manually.

### D-24 Statuses — *Adopted*
Canonical stored and derived statuses are listed in the glossary (§3). Key rulings: `overdue` and quotation `expired` are **derived, never stored** (INV-03, QT-10). Quotation approval status is `accepted` (not `approved`). Booking has no `tentative` in V1. Invoice uses `cancelled` (no `void`). `viewed` on quotations is reserved but unused in V1 (no open tracking). Reviews are `pending → approved | rejected`, and re-hiding an approved review sets it back to `pending` (REV-07).

### D-25 Time — *Adopted*
Timestamps are `timestamptz` (UTC). Business dates are `date` interpreted in `Asia/Kolkata`. FY and "today" are always computed in IST.

### D-26 Naming conventions — *Adopted*
Tables are snake_case plural; money `_paise`, rates `_bps`, timestamps `_at`, dates `_date`, booleans `is_…`; UUID primary keys; enums snake_case. TypeScript uses camelCase. Singleton settings table is `business_settings`.

---

## Part D — Integrations and infrastructure

### D-27 Gmail data model and templates — *Adopted*
Table `gmail_credentials` (single row, unique constraint): connected Google email, display name, reply-to, access and refresh tokens **encrypted in the application layer with AES-256-GCM** (env `GOOGLE_TOKEN_ENCRYPTION_KEY`), scopes, status, connected_by/at. The `PDF_ENCRYPTION_KEY` and `ENCRYPTION_KEY` names are retired. `email_send_log` records document, recipient, subject, Gmail message ID, status, error, sender account and an idempotency key (unique) to block double sends (GMAIL-NFR-01). Email **content** is owner-editable in the database with a whitelist of merge tags (SET-03), rendered inside a fixed branded layout component. If Gmail is disconnected or broken, the UI offers Download PDF plus a reconnect banner (GMAIL-03/08).

### D-28 PDF — *Adopted* (*Verify*)
`@react-pdf/renderer` in a Node-runtime Route Handler. Generation is synchronous with a 10-second budget (5 seconds target); the asynchronous fallback in QT-NFR-01 is deferred to a later phase and failures show a retry message. Fonts must be embedded and must include the ₹ glyph, since the default PDF fonts do not. `pdf_path` and `pdf_generated_at` allow staleness warnings. Signed download URLs expire after 1 hour (Requirements QT-NFR-02). Demo PDFs carry the watermark from the Portfolio Plan.

### D-29 Storage — *Adopted*
| Bucket | Access | Max size |
|---|---|---|
| `portfolio` | public | 20 MB (images) |
| `branding` | public | 5 MB |
| `documents` (generated PDFs) | private | 10 MB |
| `client-uploads` | private | 50 MB |
| `expense-receipts` | private | 10 MB |
| `crew-assets` | private | 10 MB |

**Deliverable media is not hosted in Supabase** in V1. Delivery stages hold external links (for example Google Drive) and notes, with small attachments up to 50 MB. Portfolio videos are embed URLs (YouTube/Vimeo). The 2 GB limit in the API doc is removed.

### D-30 Realtime — *Adopted*
No Supabase Realtime in V1. The dashboard auto-refreshes every 5 minutes (DASH-NFR-02), and the notification bell polls every 60 seconds from a `notifications` table. Realtime is a post-MVP option. Architecture §5.3 and Integration §1.4 are superseded.

### D-31 Versions and hosting — *Adopted* (verified 2026-11-10)
**Next.js 16** (Node 20.9+), React 19, Tailwind v4, strict TypeScript. In Next.js 16 `middleware.ts` is renamed **`proxy.ts`** (exported function `proxy`, Node.js runtime only). The old name still works but is deprecated, so the project uses `proxy.ts` from day one and keeps it thin (session refresh, MFA level, route matrix; no heavy queries). Production requires **Vercel Pro** (Hobby forbids commercial use; about $20 per seat per month) and **Supabase Pro** (about $25 per month plus compute). Dev and demo can stay on free tiers. Supabase Free has no automatic backups and pauses after inactivity, so the demo project relies on the weekly reset cron to stay awake.
**Backups (my decision):** Pro includes 7 days of daily backups. **Point-in-time recovery is a separate add-on at about $100 per month per 7 days and needs at least Small compute.** Launch **without PITR**, with a nightly logical export of critical tables to external storage and a quarterly restore drill, giving an RPO of about 24 hours. Revisit PITR after the first few months of real revenue or after any data incident.

### D-32 Demo environment — *Adopted*
Same repository, **second Vercel project plus a separate Supabase project**, instead of a copied repo (avoids drift and sync problems; real data never enters the repo anyway). Demo is writable with a weekly reset. Safety guards: server-only `APP_MODE=demo` plus the public mirror for the banner; at boot the app **refuses to start** if `APP_MODE` and the Supabase project ref disagree with an allowlist; the MFA bypass applies only when both match. User invitation and email features are disabled in demo. Seed data uses relative dates, clearly invalid phone numbers, `@demo.email` addresses, and none of the Razorpay/WhatsApp/SMS stubs, which are out of scope. A secret scanner runs on the repo.

---

## Part E — Product behaviour

### D-33 Enquiries and clients — *Adopted*
Public form creates an **enquiry only** (no client record), consistent with CLI-05. "Create/link client" is an explicit action on the enquiry, which runs duplicate detection (CLI-03). Clients have up to 3 phones and 2 emails; the schema will use child tables so duplicate checks can be indexed.

### D-34 Crew scheduling — *Adopted*
Overlap with another assignment and overlap with recorded unavailability are both **warnings that require an explicit, logged override** (BK-05). Server-side check is mandatory (BK-NFR-02). Unavailability is entered by Manager/Owner. Crew accounts are optional, and crew see only their own schedule at `/crm/schedule`.

### D-35 Bookings — *Adopted*
Stored statuses `confirmed → in_progress → completed | cancelled`. Cancelling requires a reason and an optional cancellation fee, and **leaves invoices intact** (BK-08). The Testing cascade test that auto-cancels invoices is wrong and will be corrected.

### D-36 Delivery — *Adopted*
Exactly one pipeline per booking with the 9 stages in the glossary, created with the booking. Sequential completion is enforced and can be overridden only by Owner or SysAdmin (DEL-03). Client-facing share is `/delivery/[token]`, showing links only. The Roadmap's 6 stages, `delivery_feedback` thread, and the API's per-type delivery items are replaced.

### D-37 Reviews — *Adopted*
Requirements shape: overall plus communication, quality and punctuality ratings; statuses `pending → approved | rejected`; one review per booking token; links expire after 30 days. The API's single `rating` and `wouldRecommend` fields are corrected.

### D-38 Public site content — *Adopted*
Editable from Settings: studio profile, social links, home/about text, FAQ items, legal pages, per-page SEO meta and Open Graph image. Services and packages come from the catalogue (`show_on_website`), portfolio from CRM portfolio management, reviews from moderation. Storage is `site_content` (key/jsonb), `site_page_seo` and `faq_items`.

### D-39 Single business — *Adopted*
No multi-tenant concepts anywhere (OS-01). `business_settings` is a singleton row.

### D-43 Data reset and setup mode — *Confirmed* (feature) / *Adopted* (design)
The owner wants to clear sample or existing data and enter real data by hand. This is a **Settings → Data management** feature (`/admin/system/data`, link from Settings), with these rules, chosen to coexist with the immutability and 8-year retention rules (D-14, D-21):
- **Setup mode.** `business_settings.setup_mode` is `true` on a fresh install. While it is true, the System Administrator can reset business data. When the studio is ready to go live, SA presses **Lock setup** (typed confirmation, irreversible in the app). After locking, reset is **disabled in production**, so real financial records can never be wiped from the UI. In **demo mode** reset is always allowed (it is the weekly reset).
- **Who and how.** SA only, at `aal2`, with password re-entry and a typed phrase (`RESET VOWS DATA`). A **dry run** first shows row counts per table.
- **Scopes (checkboxes, with automatic dependency selection):** Clients and everything that depends on them (enquiries, quotations, bookings and events, delivery, reviews, invoices, payments, receipts, credit notes, follow-ups, activity, email log); Finance only (invoices, credit notes, payments, allocations, receipts, expenses, manual income, crew pay); Crew (profiles, assignments, unavailability, pay); Catalogue (services, packages, prices, quotation templates); Portfolio and website content; Notifications and activity; Sample data (everything loaded by the sample-data loader). Options: **restart numbering at 000001** and **also clear the audit log** (the second only in setup mode).
- **Never touched:** user accounts and roles, business settings, email templates, expense categories, Gmail connection, document number configuration.
- **Safety.** A zip export (CSV) of the affected tables is created and stored in the private `documents` bucket (and offered for download) **before** deletion; if the export fails, the reset aborts. Stored files tied to deleted rows (PDFs, receipts, portfolio images) are removed. One transaction through a database function that uses a transaction-local flag so the immutability triggers allow the deletes. A `data_reset` audit entry records scope, counts and actor (written after any audit clearing).
- **Sample data.** An optional **Load sample data** action (setup mode and demo only) inserts the synthetic Lumina Studio dataset, tagged so the Sample scope can remove exactly it. The same seed powers the demo environment.
- **Setup checklist.** A first-run checklist on `/admin/system/data` (studio profile, branding, Gmail, catalogue, crew, first client) ends with Lock setup.
- **After lock.** The only way to clear data in production is a manual break-glass database procedure documented in SECURITY_PLAN §12.5.

---

## Part F — Process and quality

### D-40 Phases and roadmap amendments — *Adopted*
The Roadmap's Phase 0–10 numbering is canonical; the Brief's phase table is superseded. Additions: Service Catalogue and packages, quotation templates and basic numbering settings → Phase 2; crew pay records and credit notes → Phase 4; GST engine (hidden UI) → Phase 2 and 4; notifications table → Phase 2. Phase 0 additionally includes: Google consent screen set to External/In production, Upstash and Turnstile accounts, and the Stitch design step (driven by UI_DESIGN_SPEC).

### D-41 Quality targets — *Adopted*
One set of targets: dashboard LCP < 2.5 s and fully loaded < 3 s on 4G; public pages LCP < 2.5 s, Lighthouse mobile performance ≥ 85, SEO ≥ 90, accessibility ≥ 90; PDF generation ≤ 10 s (5 s target); server p95 < 500 ms. Financial and validation code at 100% coverage, enforced **per folder** in Vitest config.

### D-42 Testing in CI — *Adopted*
CI runs lint, typecheck, unit tests **and integration tests** (Supabase CLI started in GitHub Actions, so RLS, concurrency and numbering tests are automated, as Brief SC-03 and AUTHZ-07 require). E2E remains manual against the preview before merging to `main`. Lighthouse CI runs on public pages. Pixel-based PDF visual regression (SC-04) is replaced by PDF smoke tests that extract text and assert key fields. Test roles and flows are re-mapped to the six roles (for example, E2E flows 2–4 run as `business_owner` or `manager` and `accountant` as appropriate).

---

## Part G — Edits implied for existing documents

| Document | Main edits |
|---|---|
| 01 Brief | Role/MFA (D-01, D-02); phases (D-40); Gmail quota statement (remove the "1 billion messages/day" claim); hosting tiers (D-31); demo = writable (D-32). |
| 02 Requirements | AUTH-03 MFA scope (D-02); GMAIL-01 add `openid email` (D-03); AUDIT-02 IP/UA best-effort (D-15); GST-02 `_paise`/`_bps` names (D-16); QT-NFR-01 async deferred (D-28); Module 08 and 10–13 role tables; ledger wording (D-23). |
| 03 Architecture | Remove `/signup`, `tenants`, Calendar node, Realtime (D-08, D-30); update tree (D-07); roles and RLS source (D-05); service-role rules (D-12); add missing routes and `supabase/`, `tests/`. |
| 04 API Contracts | Replace auth levels with the six roles/permissions; shrink to Route Handler contracts (D-06); add receipts, credit notes, Gmail OAuth, void payment, cancel/convert, reviews/delivery token endpoints; fix enums, statuses, review shape; fix error semantics (D-13). |
| 05 Integration | Fix MFA/aal snippet (D-05); role source; Gmail table, consent type, key names, scopes (D-03, D-27); bucket names (D-29); realtime removal (D-30); Next 15+ async `cookies()`. |
| 06 Portfolio Clone | Same repo plus second project (D-32); boot guard; relative-date seeds; invalid phone numbers; remove out-of-scope stubs; seed ordering (auth users first). |
| 07 Roadmap | Role set (D-01); route names; add catalogue, crew pay, credit notes, templates (D-40); delivery 9 stages (D-36); payment model details (D-21); remove `ledger_entries` (D-23). |
| 08 Testing | Paths (D-07); roles; rounding test (D-16); remove per-line discount (D-17); booking cancellation cascade (D-35); CI scope and thresholds (D-41, D-42); add credit-note, FY-rollover, timezone and CGST/SGST odd-paise tests. |

---

## Part H — Verification results (2026-11-10) and remaining items

| Item | Result |
|---|---|
| Next.js route-protection file | Verified: `proxy.ts` in Next.js 16, Node runtime, codemod exists (D-31). |
| Custom Access Token Hook | Verified: available on Free and Pro. Claim is top-level (`user_role`). MFA and password-verification hooks are Teams/Enterprise only, so lockout stays custom (D-09). |
| Recovery link expiry | Verified: governed by the project OTP expiry setting (default 1 hour). Invitations stay in our own table (D-10). |
| Gmail personal limit | Verified: about 500 recipients per day shared across all clients (D-03). |
| Google consent screen | Verified: External plus Testing means 7-day refresh tokens. Use In production (D-03). |
| Vercel plan | Verified: Hobby is non-commercial. Pro required. Cron: Hobby once per day; Pro per minute (D-31). |
| Supabase PITR | Verified: paid add-on, about $100 per month per 7 days, needs Small compute. Launch without it (D-31). |
| DPDP Act | Verified: Rules notified 13 Nov 2025; Board provisions live; main fiduciary obligations phase in with a compliance date of about 13 May 2027; breach reporting to the Board and affected individuals; CERT-In incident reporting runs in parallel. Build to comply from launch. Not legal advice; confirm with an advisor. |
| Still open (implementation-time) | ₹ glyph rendering in the chosen PDF font (D-28); Cloudflare Turnstile and Upstash free-tier limits (D-11); TOTP MFA availability and recovery-code approach on the chosen Supabase plan (SECURITY_PLAN §4). |

### Original list (for reference)

1. Current stable Next.js major and its route-protection file name (D-31).
2. Supabase Custom Access Token Hook availability and session revocation behaviour (D-05).
3. Supabase admin `generateLink` recovery behaviour and OTP expiry limits (D-10).
4. Personal-Gmail daily send limit and the "In production / unverified app" consent flow (D-03).
5. Vercel Pro and Supabase Pro/PITR requirements and pricing (D-31).
6. Cloudflare Turnstile and Upstash free-tier limits (D-11).
7. A PDF font that includes the ₹ glyph and renders correctly in `@react-pdf/renderer` (D-28).
8. India DPDP Act obligations (notice, consent, erasure, breach reporting) for the Security Plan (D-14).
