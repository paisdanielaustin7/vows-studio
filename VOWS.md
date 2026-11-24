# VOWS — Master System Architecture & Project Blueprint
**Brand:** VOWS
**Tagline:** Wedding Cinematic & Stills
**Creative Director / Principal:** Reuben Serrao
**Repository:** `vows-studio`
**Last Updated:** November 2026

---

## 1. Executive Summary & Brand Identity

VOWS is an bespoke, single-tenant ERP, CRM, and digital monograph engineered specifically for **VOWS** (founded and directed by Reuben Serrao). The studio produces archival analog stills and heirloom wedding cinematography across Goa, Mangalore, Bangalore, and international heritage destinations.

### Brand Design System
- **Typography:** Inter (`var(--font-inter)`) universally applied across all public, CRM, and administrative interfaces. Cormorant and decorative fonts were deprecated in favor of a clean, editorial architectural aesthetic.
- **Palette:** Understated botanical and architectural monochrome:
  - **Light Mode:** Sage cream base (`#F7F9F6`), forest deep accents (`#4C6452`), olive containers (`#E5ECE4`), obsidian text (`#171D19`).
  - **Dark Mode:** Deep obsidian canvas (`#141217`), slate surfaces (`#221F27`), emerald rings and indicators (`#829B87`), crisp light text (`#F1EEF3`).
- **Logos:**
  - `logo-light.png`: High-resolution black typography artwork, used exclusively on light-mode backgrounds.
  - `logo-dark.png`: High-resolution white typography artwork, used exclusively on dark-mode backgrounds.
  - Controlled via Tailwind CSS v4 class variant `@custom-variant dark (&:where(.dark, .dark *));` and synchronous pre-render theme bootstrap in `<head>`, ensuring flawless persistence without flickering.

---

## 2. Core Technology Stack

- **Framework:** Next.js 16 (App Router, Turbopack, Server Actions, React 19)
- **Database & Auth:** PostgreSQL 16 on Supabase with 100% Row Level Security (RLS) enforcement and Security Definer RPCs.
- **Styling:** Tailwind CSS v4 with custom theme inline variables and class-based dark mode variants.
- **State & Querying:** Next.js Server Components, Server Actions (`use server`), TanStack React Query v5, Optimistic UI local mutations.
- **Financial Precision:** BigInt integer paise architecture (`1 INR = 100 paise`), zero float rounding leakage, basis point tax calculators (`18% = 1800 bps`).
- **PDF Generation:** `@react-pdf/renderer` v4 with embedded Indian Rupee glyph (`₹`), registered TTF typography, and verified vector layout templates.
- **Rate Limiting & Security:** `@upstash/ratelimit`, Upstash Redis REST, Cloudflare Turnstile CAPTCHA, AES-256-GCM token encryption for OAuth secrets.
- **Testing & Quality Assurance:** Vitest v3 with V8 coverage (maintaining 100% test coverage on `lib/money/**` and `lib/validations/**`), TypeScript strict type checking (`tsc --noEmit`), ESLint.

---

## 3. Role-Based Access Control (RBAC)

The application enforces a strict 6-tier role matrix defined in `lib/constants/permissions.ts` and validated via RLS database policies:

1. **`system_admin` (SA):**
   - Full master authority: infrastructure settings, database backups, audit trail inspection, user provisioning, role promotion/demotion, superuser immunity against accidental self-lockouts.
2. **`business_owner` (BO):**
   - Commercial head (Reuben Serrao): full visibility into revenue, financial ledger, quotation approvals, client directory, contracts, delivery timelines, pricing catalogues, and banking configurations.
3. **`manager` (MG):**
   - Studio operations director: lead qualification, enquiry management, crew scheduling, shoot coordination, asset delivery tracking, and client communications.
4. **`accountant` (AC):**
   - Pure financial controller: invoices, payments, credit notes, expenses, vendor disbursements, GST tax returns, and general ledger reports (strictly barred from shoot assignment and creative operations).
5. **`staff` (ST):**
   - Post-production coordinators and studio staff: pipeline stage transitions, file upload review, delivery checklists (all client money, contract values, and pricing figures are strictly redacted via `bookings_ops_v` views).
6. **`crew_member` (CR):**
   - Lead photographers, cinematographers, drone operators, assistants: read-only access to their assigned shoot call sheets, event timelines, shoot locations, and equipment notes (zero visibility into studio financials or client contract fees).

---

## 4. Multi-Event Enquiry & Production Pipeline

In Christian, coastal, and destination nuptials, a single client enquiry frequently spans multiple discrete events across different days and venues (e.g., **Roce** on Dec 10 at Milagres Hall, **Nuptials** on Dec 12 at Rosario Cathedral, followed by an evening **Reception** at an outdoor estate).

### Architectural Implementation:
1. **Multi-Event Enquiry Intake:**
   - Enquiries support an `events` JSON array containing structured event entries (`name`, `eventType`, `eventDate`, `venue`, `guestCount`, `startTime`, `endTime`).
   - The primary event fields (`event_type`, `event_date`, `venue`) remain indexed for backwards compatibility, while the full array captures the complete celebration suite.
   - Client and guest identities auto-sync with deduplication guards into the master `public.clients` directory.
2. **Unified Quotation Generation:**
   - Single master quotation document generated from the enquiry, displaying all covered events.
   - Line items can be assigned to individual celebrations or bundled into package suites.
   - Master financial calculations (subtotal, pro-rata discount apportionment, CGST/SGST/IGST, total investment) remain consolidated into one document.
3. **Atomic Booking Conversion:**
   - Converted via `public.convert_enquiry_to_booking` or `public.create_booking_from_quotation`.
   - Generates one atomic booking number (`BK-2627-...`).
   - Iterates through the enquiry or quotation's `events` array, inserting a distinct row into `public.events` for each event with foreign key reference `booking_id`.
   - All events automatically surface on the Master Studio Schedule, Crew Conflict Detector, and Call Sheet Generator.
4. **Consolidated Invoicing & Milestones:**
   - The entire booking is billed under unified milestone invoices (e.g., Advance Retainer, Shoot Day Milestone, Final Deliverables Balance).
5. **Integrated 9-Stage Delivery Pipeline:**
   - Automatically initializes the 9 standard delivery stages:
     1. `raw_ingest`
     2. `culling`
     3. `audio_sync`
     4. `first_cut`
     5. `colour_grading`
     6. `sound_design`
     7. `client_review`
     8. `final_exports`
     9. `archival`
   - Master delivery tracker presents deliverables across all events to the couple under one private review link (`/delivery/[token]`).

---

## 5. Complete Database Migration History (001–030)

| Migration | Name / Purpose | Key Artifacts & Tables |
|---|---|---|
| **001** | `extensions_enums` | `citext`, `uuid-ossp`, `pgcrypto`, role enums, event types, invoice/quotation statuses. |
| **002** | `helpers_app_schema` | `app` helper schema, `next_document_number` sequence generator, `touch_updated_at`. |
| **003** | `identity_audit` | `profiles`, `audit_logs`, `app.audit_trigger` automated table auditing. |
| **004** | `business_configuration` | `business_settings`, `email_templates`, `document_number_configs`. |
| **005** | `clients_enquiries` | `clients`, `client_phones` (max 3), `client_emails` (max 2), `enquiries`, `follow_ups`. |
| **006** | `catalogue` | `services`, `service_price_history`, `packages`, `package_items`. |
| **007** | `quotations` | `quotations`, `quotation_items`, versioning (`root_id`, `version_no`), integer paise calculations. |
| **008** | `bookings_crew_schedule` | `bookings`, `booking_line_items`, `events`, `crew_members`, `event_crew_assignments`, `bookings_ops_v`. |
| **009** | `billing_payments` | `invoices`, `invoice_items`, `payments`, `payment_receipts`, `credit_notes`. |
| **010** | `ledger_views` | `general_ledger_v`, financial reporting views, monthly revenue aggregation. |
| **011** | `delivery_pipeline` | `delivery_pipelines`, `delivery_stages`, `public.init_booking_delivery_pipeline`. |
| **012** | `portfolio` | `portfolio_items`, categories, sort orders, public monograph showcases. |
| **013** | `reviews` | `reviews`, public token submission flow, star ratings, testimonial moderation. |
| **014–020** | `rls_policies_part1-7` | Exhaustive Row Level Security policies across sales, finance, ops, delivery, portfolio. |
| **021** | `data_management` | Administrative soft-delete purges, GDPR client anonymization, export controls. |
| **022** | `schema_grants` | Granular table and function grants for `anon`, `authenticated`, and `service_role`. |
| **023** | `profiles_self_select` | Profile self-read and basic update grants for active sessions. |
| **024** | `fix_audit_trigger_role` | Audit trigger resiliency and safety against missing role metadata. |
| **025** | `auto_sync_enquiries_clients` | Instant bidirectional synchronization between enquiry guest details and client records. |
| **026** | `system_admin_superuser_guard` | Enforces last active Business Owner / System Admin guardrails against deactivation. |
| **027** | `quotation_payload_case_resilience` | Resilient JSON parsing in quotation stored procedures supporting camelCase and snake_case. |
| **028** | `flawless_auth_sync_and_lockout` | Authoritative password sync, normalized email lookup, stale lockout reset, SA immunity. |
| **029** | `brand_system_vows_and_wedding_cinematics` | Standardized brand identity to "VOWS" and "Wedding Cinematic & Stills" across defaults & templates. |
| **030** | `enquiry_multiple_events` | Multi-event JSON arrays on enquiries/quotations, enhanced atomic booking conversion RPCs. |

---

## 6. Financial Architecture & GST Engine

All financial computations in VOWS are mathematically provable and immune to floating-point rounding errors:
- **Base Unit:** Every monetary amount is stored as an `integer` or `bigint` in paise (`₹1,50,000.00 = 15000000 paise`).
- **GST Calculations (`lib/money/calculator.ts`):**
  - Rates are configured in basis points (`18% = 1800 bps`, `9% = 900 bps`).
  - CGST + SGST (intra-state): `taxable * 900 / 10000` each.
  - IGST (inter-state): `taxable * 1800 / 10000`.
- **Pro-Rata Discount Apportionment:**
  - Discounts are apportioned across line items proportional to item subtotal with largest-remainder rounding, ensuring the sum of discounted item totals precisely matches the net contract value.
- **Sequenced Document Identifiers:**
  - `ENQ-2627-0001` (Enquiry)
  - `QT-2627-0001` (Quotation)
  - `BK-2627-0001` (Booking Contract)
  - `INV-2627-0001` (Tax Invoice)
  - `REC-2627-0001` (Payment Receipt)
  - `CN-2627-0001` (Credit Note)
  - `EXP-2627-0001` (Studio Expense)

---

## 7. Mobile Web Application & Navigation

The mobile application is optimized for on-location shoots, rapid quotation drafting, and zero-delay navigation:
- **Instantaneous Pre-Fetching:** Every `<Link>` in the navigation bar and drawer enforces `prefetch={true}`, ensuring code chunks and server component data are cached before the user taps.
- **Fixed 5-Action Bottom Navigation Bar:**
  1. **Dashboard:** (`/crm/dashboard`) High-level operational overview, alerts, and today's shoots.
  2. **Quote:** (`/crm/quotations/new`) Direct shortcut for drafting a quotation on location.
  3. **Invoice:** (`/crm/invoices/new`) Instant billing generation for clients.
  4. **Ledger:** (`/crm/ledger`) Studio ledger view for checking revenue, receipts, and outstanding balances.
  5. **Menu:** Opens the slide-up quick navigation sheet for Bookings, Schedule, Enquiries, Clients, Expenses, Crew Directory, Deliveries, Settings, and Profile.
- **Zero Input Glitches:**
  - Controlled numeric inputs display placeholders when zero, automatically highlight all characters on focus (`onFocus={(e) => e.target.select()}`), and prevent unwanted `0` prefixes when typing rates or quantities.
- **Form State Cleansing:**
  - Modal dialogues (Clients, Enquiries, Payments, Expenses) reset their local state on open, close, and submit, completely eliminating residual data leaks between entries.
- **Optimistic UI Updates:**
  - Entity creations immediately prepend to local state for instantaneous feedback (sub-10ms perceived latency) while background router revalidations refresh the server cache.

---

## 8. Deployment, Remotes & Contribution Guidelines

The project maintains dual Git remotes:
- **`origin`**: `https://github.com/paisdanielaustin7/vows-studio.git`
  - Commits authored by **Daniel Pais** (`pais.danielaustin@gmail.com`).
- **`reuben`**: `https://github.com/reubenserrao7/vows-studio.git`
  - Commits authored by **Reuben Serrao** (`reubenserrao7@gmail.com`).

### Quality Checklist Before Push:
1. `npm run test:coverage`: Must pass 100% on `lib/money/**` and `lib/validations/**`.
2. `npm run typecheck`: Must complete with zero TypeScript compilation errors.
3. `npm run lint`: Zero ESLint errors.
4. `npm run build`: Production Next.js build must compile cleanly.

---

## 9. Recent Updates: Schema Cache Resilience for Multi-Event Enquiries
- **Issue:** Inserting a new enquiry threw PostgREST error PGRST204: `"Could not find the 'events' column of 'enquiries' in the schema cache"` when remote database schema cache had not reloaded migration 030 (`20261120000030_enquiry_multiple_events.sql`).
- **Fix Implemented:**
  1. `server/actions/enquiry.actions.ts`: Added automatic PostgREST schema cache missing column detection. If PostgREST fails due to missing `events` column, it automatically falls back to standard columns without crashing, safely serializing the event list into `notes` (`<!-- EVENTS_DATA:... -->` + human-readable schedule).
  2. `lib/sales/enquiry-events.ts`: Added `extractEventsFromEnquiryRow` and `cleanNotesForDisplay` utilities to seamlessly reconstruct multi-event arrays whether saved in `events` jsonb column, embedded in `notes`, or synthesized from legacy single-event fields.
  3. `app/crm/quotations/new/page.tsx` & `server/actions/booking.actions.ts`: Added schema-cache safe query fallbacks so quote and booking conversion never fail even if PostgREST cache has not updated.
  4. `supabase/migrations/20261120000030_enquiry_multiple_events.sql`: Added `NOTIFY pgrst, 'reload schema';` command to immediately flush and reload PostgREST schema cache upon execution.

---

## 10. Phone & Email Input Container Proportions (Universal UX Rule)
- **Problem:** Phone containers (typically holding ~10-13 digits) previously took up 2 columns (`sm:col-span-2`), while Email Address containers (often holding 25-35+ characters) took up only 1 column (`sm:col-span-1`), causing emails to be horizontally clipped or unreadable.
- **Universal Fix Applied Across All System Entry Containers:**
  1. `components/enquiries/enquiries-board.tsx`: Phone (`sm:col-span-1`, 33%) and Email (`sm:col-span-2`, 67%).
  2. `components/clients/clients-table.tsx`: Primary Phone (`sm:col-span-1`, 33%) and Email Address (`sm:col-span-2`, 67%).
  3. `components/crew/crew-directory.tsx`: Phone (`sm:col-span-1`, 33%) and Email (`sm:col-span-2`, 67%).
  4. `components/settings/studio-profile-form.tsx`: Studio Phone (`md:col-span-1`, 33%) and Studio Email (`md:col-span-2`, 67%).
  5. `components/public/public-enquiry-form.tsx`: Mobile (`sm:col-span-1`, 33%) and Email Address (`sm:col-span-2`, 67%).
- **Result:** Email IDs are completely visible across all screens and forms without truncation.
