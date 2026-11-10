# VOWS Studio — Requirements Specification

> **Document Version:** 1.0  
> **Status:** Draft  
> **Prepared By:** System Architect  
> **Date:** 2026-11-09  
> **Classification:** Internal — Confidential

---

## Table of Contents

1. [Cross-Cutting Requirements](#1-cross-cutting-requirements)
   - 1.1 Authentication
   - 1.2 Authorization & RBAC
   - 1.3 Audit & Compliance
   - 1.4 Data Retention
   - 1.5 Financial Calculation Rules
   - 1.6 Document Numbering Rules
   - 1.7 GST Readiness
   - 1.8 Mobile Responsiveness
2. [Module 01 — Dashboard](#2-module-01--dashboard)
3. [Module 02 — Clients & Enquiries](#3-module-02--clients--enquiries)
4. [Module 03 — Quotations](#4-module-03--quotations)
5. [Module 04 — Bookings & Events](#5-module-04--bookings--events)
6. [Module 05 — Invoices & Payments](#6-module-05--invoices--payments)
7. [Module 06 — Ledger & Expenses](#7-module-06--ledger--expenses)
8. [Module 07 — Crew Management](#8-module-07--crew-management)
9. [Module 08 — Service Catalogue](#9-module-08--service-catalogue)
10. [Module 09 — Delivery Management](#10-module-09--delivery-management)
11. [Module 10 — Settings & Configuration](#11-module-10--settings--configuration)
12. [Module 11 — Gmail Integration](#12-module-11--gmail-integration)
13. [Module 12 — Public Website](#13-module-12--public-website)
14. [Module 13 — Feedback & Reviews](#14-module-13--feedback--reviews)

---

## 1. Cross-Cutting Requirements

### 1.1 Authentication

> [!IMPORTANT]
> Authentication is enforced at the Supabase Auth layer. All backend routes and RLS policies must assume the JWT provided by Supabase is the authoritative identity source.

**AUTH-01.** The platform uses Supabase Auth as the sole identity provider. No third-party SSO (Google, GitHub, etc.) is permitted for internal accounts.

**AUTH-02.** Authentication is by email address and password only. Passwords must be a minimum of 12 characters and satisfy complexity rules (uppercase, lowercase, digit, special character).

**AUTH-03.** Multi-factor authentication (TOTP via authenticator app) is **mandatory** for the System Administrator role and cannot be disabled or bypassed.

**AUTH-04.** MFA is **optional** for all other roles. The UI must actively encourage non-SysAdmin users to enable MFA at their first login.

**AUTH-05.** There is no public user registration flow. All user accounts are provisioned exclusively by the System Administrator via an invite mechanism.

**AUTH-06.** Invitation tokens must be single-use and expire after 72 hours. Expired invitations must be resendable by SysAdmin.

**AUTH-07.** Failed login attempts must be rate-limited: maximum 5 consecutive failures within 15 minutes triggers a 30-minute account lockout. SysAdmin can unlock any account manually.

**AUTH-08.** Session tokens (JWTs) must have a maximum lifetime of 1 hour with refresh token rotation. Refresh tokens expire after 30 days of inactivity.

**AUTH-09.** Password reset flows are email-based via Supabase's built-in reset mechanism. Reset links expire after 1 hour.

**AUTH-10.** On session expiry, the user is redirected to the login page with a clear message. Unsaved form data must be preserved in `sessionStorage` where feasible.

**AUTH-11.** All authentication events (login success, login failure, MFA success, MFA failure, password change, password reset, role change) must be recorded in the audit log.

---

### 1.2 Authorization & RBAC

**AUTHZ-01.** Authorization is role-based. Every user has exactly one role at any time (no composite roles in V1).

**AUTHZ-02.** Row Level Security (RLS) policies on every Supabase table are the **primary** enforcement mechanism. Application-layer checks are a secondary defence.

**AUTHZ-03.** No user can assign themselves a role equal to or higher than their current role. Role assignment is restricted to the System Administrator.

**AUTHZ-04.** The System Administrator role is seeded at database initialisation. No application flow can create a new SysAdmin account; it can only be done directly in the database by the technical owner.

**AUTHZ-05.** The following permission matrix applies (R = Read, W = Write/Create/Update, D = Delete, — = No Access):

| Resource | SysAdmin | Business Owner | Manager | Accountant | Staff | Crew Member |
|---|---|---|---|---|---|---|
| System Configuration | RWD | — | — | — | — | — |
| User Management | RWD | — | — | — | — | — |
| Clients & Enquiries | RWD | RWD | RW | R | R | — |
| Quotations | RWD | RWD | RW | R | — | — |
| Bookings | RWD | RWD | RW | R | R | R (own) |
| Invoices & Payments | RWD | RWD | R | RW | — | — |
| Ledger & Expenses | RWD | RWD | — | RW | — | — |
| Crew Management | RWD | RWD | RW | R | — | R (own) |
| Service Catalogue | RWD | RWD | R | R | R | — |
| Delivery Management | RWD | RWD | RW | — | RW (assigned) | R (own) |
| Settings | RWD | RW | — | — | — | — |
| Public Website Content | RWD | RWD | R | — | — | — |
| Reviews (moderation) | RWD | RWD | R | — | — | — |

**AUTHZ-06.** API routes must validate the caller's role from the authenticated Supabase JWT before performing any operation. Returning a 403 response (not 404) for forbidden resources is required.

**AUTHZ-07.** RLS policies must be tested with an automated test suite that attempts each operation as each role and asserts the correct allow/deny outcome.

---

### 1.3 Audit & Compliance

**AUDIT-01.** An `audit_log` table must record every create, update, and delete operation on the following tables: clients, enquiries, quotations, bookings, invoices, payments, expenses, crew_members, service_catalogue, delivery_stages, reviews, settings, users.

**AUDIT-02.** Each audit log entry must capture: `id`, `actor_user_id`, `actor_role`, `action` (CREATE / UPDATE / DELETE), `table_name`, `record_id`, `old_values` (JSONB, nullable), `new_values` (JSONB, nullable), `ip_address`, `user_agent`, `created_at`.

**AUDIT-03.** Audit log entries are immutable. No application code, role, or RLS policy may permit UPDATE or DELETE on `audit_log`. It is append-only.

**AUDIT-04.** The SysAdmin can view the full audit log. The Business Owner can view audit entries for their own actions and entries related to business records (not user management actions).

**AUDIT-05.** Sensitive field values (passwords, tokens) must never appear in audit log `old_values` or `new_values`.

**AUDIT-06.** The platform must comply with India's Information Technology Act, 2000 and IT (Amendment) Act, 2008 with regard to data storage and access control.

---

### 1.4 Data Retention

**RETENTION-01.** Client personal data (name, phone, email, address) must be retainable for a minimum of 7 years to satisfy potential tax audit requirements.

**RETENTION-02.** Financial records (invoices, payments, expenses) must be retained for a minimum of 8 years from the date of creation.

**RETENTION-03.** The SysAdmin may soft-delete any record (setting `deleted_at` timestamp). Hard deletion requires explicit confirmation and is logged in the audit log.

**RETENTION-04.** Soft-deleted records must be excluded from all application queries by default. A "Show Archived" toggle may reveal them where appropriate.

**RETENTION-05.** On user account deactivation, the user's records are retained but the account is locked. Deactivation is preferred over deletion.

---

### 1.5 Financial Calculation Rules

> [!CAUTION]
> All monetary values must be stored and computed as **integer paisa** (smallest INR unit). Never store or compute with floating-point decimals for monetary amounts.

**FIN-01.** All monetary amounts in the database are stored as `INTEGER` or `BIGINT` representing paisa (1 INR = 100 paisa). Example: ₹1,500.50 → stored as `150050`.

**FIN-02.** A shared TypeScript utility module (`lib/money.ts`) must implement all monetary arithmetic (addition, subtraction, multiplication by integer quantity, percentage calculation with rounding rules). No inline arithmetic on monetary values is permitted elsewhere.

**FIN-03.** Percentage discounts are applied using **round-half-up** rounding on the final paisa amount.

**FIN-04.** Tax calculations (GST — when enabled) must compute CGST and SGST individually in paisa with round-half-up rounding each, then sum.

**FIN-05.** All display of monetary amounts must use the `Intl.NumberFormat` API with locale `en-IN` and currency `INR`. Example output: ₹1,500.50.

**FIN-06.** The sum of all line items in a quotation or invoice must be recomputed server-side on every save. The client-submitted total must be validated against the server-computed total and rejected if they differ by more than 0 paisa.

**FIN-07.** Partial payment arithmetic: `amount_due = total_amount - sum(payments.amount_paid)`. This is always computed, never stored directly (or if cached, invalidated on any payment change).

**FIN-08.** No financial record once marked as `paid` or `partially_paid` may be edited without creating a corrective record (credit note or adjustment). An audit log entry is mandatory for any such correction.

---

### 1.6 Document Numbering Rules

**DOCNUM-01.** Quotations, invoices, and receipts each have an independent, sequential numbering series.

**DOCNUM-02.** Default formats:
  - Quotation: `QT-{YYYY}-{NNNNNN}` (e.g., `QT-2025-000001`)
  - Invoice: `INV-{YYYY}-{NNNNNN}` (e.g., `INV-2025-000001`)
  - Receipt: `RCP-{YYYY}-{NNNNNN}` (e.g., `RCP-2025-000001`)

**DOCNUM-03.** `{YYYY}` represents the financial year of the document creation date. For India, the financial year starts on April 1. A document created on 2025-05-15 belongs to FY 2025 (FY 2025–26).

**DOCNUM-04.** The sequence counter resets to `000001` at the start of each financial year. The reset must be atomic to prevent gaps or duplicates.

**DOCNUM-05.** The prefix, year format, and padding width are configurable per document type in Settings. Changes take effect for newly created documents only.

**DOCNUM-06.** Document numbers, once assigned, are immutable. No renumbering or sequence alteration is permitted after a document is created.

**DOCNUM-07.** Number generation must use a database-level sequence (PostgreSQL `SEQUENCE`) or an advisory lock to guarantee uniqueness under concurrent requests.

---

### 1.7 GST Readiness

**GST-01.** GST is **not activated** by default. All GST UI elements, fields, and calculations are hidden unless a `gst_enabled` configuration flag is set to `true` in Settings.

**GST-02.** The database schema must include the following GST-related fields on quotations and invoices from day one: `gst_number` (business), `client_gst_number`, `hsn_sac_code` (per line item), `cgst_rate_bps`, `sgst_rate_bps`, `igst_rate_bps`, `cgst_amount_paisa`, `sgst_amount_paisa`, `igst_amount_paisa`.

**GST-03.** When GST is enabled, the tax type (CGST+SGST for intra-state, IGST for inter-state) is determined by comparing the studio's state code with the client's state code.

**GST-04.** PDF documents generated when GST is enabled must conform to GST invoice format requirements (GSTIN, HSN/SAC codes, tax breakdown).

**GST-05.** The business GSTIN and HSN/SAC codes per service category must be configurable in Settings.

**GST-06.** Enabling or disabling GST is a SysAdmin or Business Owner action and is recorded in the audit log.

---

### 1.8 Mobile Responsiveness

**MOB-01.** All pages must be fully functional and visually correct on viewports as narrow as 375px (iPhone SE).

**MOB-02.** Navigation on mobile must collapse into a bottom navigation bar or slide-out drawer. No horizontal scrolling on the main layout.

**MOB-03.** Data tables must reflow to card-based or stacked layouts on mobile viewports.

**MOB-04.** Forms must use full-width inputs on mobile. Touch targets must be at minimum 44×44px.

**MOB-05.** PDF previews must open in a new tab (not embedded iframe) on mobile to avoid viewport constraints.

**MOB-06.** The public website must achieve a Lighthouse Mobile Performance score of ≥ 85.

---

## 2. Module 01 — Dashboard

### 2.1 Purpose & Business Value
The Dashboard provides the Business Owner and Manager with an at-a-glance operational overview: revenue trends, booking pipeline, enquiry status, and upcoming events. It eliminates the need to navigate multiple screens to understand the state of the business.

### 2.2 User Roles & Permissions

| Role           | Access                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| SysAdmin       | Full access to all KPIs and charts                                         |
| Business Owner | Full access to all KPIs and charts                                         |
| Manager        | Access to bookings, enquiries, and crew KPIs; no financial revenue figures |
| Accountant     | Access to financial KPIs; no crew or enquiry details                       |
| Staff          | No dashboard access                                                        |
| Crew Member    | No dashboard access                                                        |

### 2.3 Functional Requirements

**DASH-01.** Display a date range selector (Today, This Week, This Month, This Financial Year, Custom Range) that filters all KPI cards and charts on the page.

**DASH-02.** Display the following KPI cards with current period value and percentage change vs. previous period:
  - Total Revenue Collected (paisa, displayed as INR)
  - Total Revenue Expected (invoiced but unpaid)
  - Total Bookings (confirmed)
  - Pending Enquiries (not yet quoted or rejected)
  - Upcoming Events (next 30 days)
  - Outstanding Invoices (count and total amount)

**DASH-03.** Display a line or bar chart of monthly revenue (collected vs. invoiced) for the selected financial year.

**DASH-04.** Display a pie or donut chart of bookings by event type (wedding, pre-wedding, portrait, corporate, etc.).

**DASH-05.** Display a list of "Upcoming Events" (next 10 events, chronologically) with event name, date, client name, and assigned crew count.

**DASH-06.** Display a list of "Recent Enquiries" (last 5 enquiries) with client name, date, and status.

**DASH-07.** Display a list of "Overdue Invoices" (invoices past due date with balance remaining).

**DASH-08.** Each widget on the Dashboard must be a clickable link to the relevant module filtered to the same data.

**DASH-09.** KPIs involving financial data must be hidden for roles without financial access (Manager, Staff, Crew Member).

**DASH-10.** The Dashboard must load within 3 seconds on a standard 4G connection. Use server-side data fetching with appropriate caching (ISR or server action with cache tags).

### 2.4 Non-Functional Requirements

**DASH-NFR-01.** Charts must be rendered using a performant client-side charting library (e.g., Recharts, Chart.js). Data is fetched once per page load and rendered on the client.

**DASH-NFR-02.** Dashboard data must refresh automatically every 5 minutes when the tab is active, without a full page reload.

### 2.5 Edge Cases & Business Rules

- If no data exists for the selected period, KPI cards show ₹0 / 0 with a "No data" subtext, not an error.
- Charts must handle months with zero revenue gracefully (bar at zero height, not a gap).
- Financial year boundary: April 1. Ensure correct year labelling in charts.

### 2.6 Acceptance Criteria

- [ ] All 6 KPI cards render with correct values matching database queries.
- [ ] Revenue chart correctly reflects collected vs. invoiced amounts.
- [ ] Financial KPIs are hidden from Manager role.
- [ ] Dashboard loads in < 3s (Lighthouse performance audit).
- [ ] Date range selector correctly filters all widgets.

### 2.7 Dependencies
- Module 02 (Enquiries), Module 04 (Bookings), Module 05 (Invoices), Module 07 (Crew).

---

## 3. Module 02 — Clients & Enquiries

### 3.1 Purpose & Business Value
Centralises all prospective and existing client records. Tracks the lifecycle of an enquiry from initial contact through to converted booking, including follow-up reminders and full activity history.

### 3.2 User Roles & Permissions

| Role | Clients | Enquiries | Follow-ups |
|---|---|---|---|
| SysAdmin / Business Owner | Full CRUD | Full CRUD | Full CRUD |
| Manager | Read + Update | Full CRUD | Full CRUD |
| Accountant | Read | Read | Read |
| Staff | Read | Read | — |
| Crew Member | — | — | — |

### 3.3 Functional Requirements

**CLI-01.** A client record must capture: full name, phone number(s) (up to 3), email address(es) (up to 2), address (line 1, line 2, city, state, pincode), source (how they found the studio), notes, `created_at`, `updated_at`.

**CLI-02.** Phone numbers must be validated against Indian mobile number format (+91 XXXXX XXXXX). International numbers allowed with explicit country code flag.

**CLI-03.** Duplicate client detection: on creating a new client, the system must warn if a client with the same phone number or email already exists. It must not auto-block creation, but surface a "Possible duplicate" banner.

**CLI-04.** A client profile page must display: client details, all linked enquiries, all linked bookings, all linked invoices, payment history, and a chronological activity feed.

**CLI-05.** An enquiry record must capture: linked client (or guest contact details if client not yet created), event type, event date (approximate), event venue, number of guests (optional), services of interest, source channel (Instagram, referral, website, walk-in, etc.), status, assigned staff, notes.

**CLI-06.** Enquiry statuses: `new` → `contacted` → `quoted` → `negotiating` → `converted` (booking created) | `lost` | `junk`.

**CLI-07.** Status transitions must be explicit user actions (not automatic), logged in the activity feed.

**CLI-08.** A follow-up scheduler must allow attaching one or more follow-up reminders to an enquiry: date/time, reminder note, assigned user. Overdue follow-ups must surface on the Dashboard.

**CLI-09.** The enquiry list view must support: search by client name/phone/email, filter by status, filter by event type, filter by date range, sort by date, sort by status.

**CLI-10.** Bulk actions on enquiry list: mark as junk, assign to staff member, export to CSV.

**CLI-11.** When an enquiry is converted to a booking, a booking record must be pre-populated with the enquiry's data. The enquiry status must automatically change to `converted`.

**CLI-12.** The activity feed on a client profile must show: enquiry status changes, follow-up completions, quotation sent, booking created, invoice sent, payment received — with actor name and timestamp.

**CLI-13.** Client and enquiry records support soft deletion. Deleted records are excluded from search results by default.

### 3.4 Non-Functional Requirements

**CLI-NFR-01.** Client list must paginate (server-side) with a default page size of 25. Pagination controls must be accessible.

**CLI-NFR-02.** Search must respond within 500ms for datasets up to 10,000 clients (use PostgreSQL full-text search or indexed `ilike`).

### 3.5 Edge Cases & Business Rules

- An enquiry can exist without a client record (guest enquiry via public form). A client record should be creatable from the enquiry detail page.
- A client can have multiple active enquiries simultaneously.
- Converting an enquiry to a booking does not delete the enquiry; it retains all history.
- A `junk` or `lost` enquiry can be re-opened by changing its status.

### 3.6 Acceptance Criteria

- [ ] Creating a client with a duplicate phone number shows a warning.
- [ ] Enquiry status transitions are logged in the activity feed.
- [ ] Follow-up reminders appear on Dashboard when overdue.
- [ ] Converting an enquiry creates a booking with pre-populated data.
- [ ] Soft-deleted clients are excluded from search results.

### 3.7 Dependencies
- Module 03 (Quotations), Module 04 (Bookings), Module 05 (Invoices), Module 01 (Dashboard).

---

## 4. Module 03 — Quotations

### 4.1 Purpose & Business Value
Enables the studio to generate professional, branded quotations for clients, track their status, manage revisions, and deliver them via email — replacing manual PDF creation.

### 4.2 User Roles & Permissions

| Role | Quotations |
|---|---|
| SysAdmin / Business Owner | Full CRUD; send via Gmail |
| Manager | Create, Read, Update (not delete); send via Gmail |
| Accountant | Read only |
| Staff / Crew Member | No access |

### 4.3 Functional Requirements

**QT-01.** A quotation must capture: quotation number (auto-generated per DOCNUM rules), client, linked enquiry (optional), event date, validity date, line items, discount, subtotal, total, status, notes to client, internal notes.

**QT-02.** Line items: service/package name, description, quantity, unit price (paisa), line total (paisa). Line items may be added from the Service Catalogue or entered manually.

**QT-03.** A discount field supports either a percentage or a fixed amount. Only one type may be active per quotation.

**QT-04.** Quotation statuses: `draft` → `sent` → `viewed` (optional tracking) → `accepted` | `rejected` | `expired`.

**QT-05.** Quotation versioning: editing a `sent` or `accepted` quotation creates a new version (v2, v3, …). All versions are retained and viewable. Only the latest version is considered "active".

**QT-06.** A quotation template system must allow saving reusable line-item sets named by event type. Templates can be applied to pre-populate a new quotation's line items.

**QT-07.** PDF generation: a "Preview PDF" action renders the quotation as a branded PDF (business logo, letterhead colours from Settings). The PDF must include: business details, client details, quotation number, validity date, line items table, totals, payment terms, and a footer note.

**QT-08.** "Send via Gmail" action attaches the PDF and sends to the client's email using the studio's connected Gmail account. The email body is drawn from a configurable template.

**QT-09.** On quotation acceptance (manual status change), a booking can be created directly from the quotation detail page. The booking is pre-populated with event details from the quotation.

**QT-10.** Quotations past their validity date must automatically display as `expired` (computed status). The stored status does not change, but the UI overlays the expired indicator.

**QT-11.** A quotation list view must support: search by client name or quotation number, filter by status, filter by date range, sort by date.

**QT-12.** A quotation in `draft` status may be fully edited. A `sent` quotation triggers a versioning prompt before editing. An `accepted` quotation is read-only; a new version must be created explicitly.

**QT-13.** Line item unit prices must be pulled from the Service Catalogue's current price by default but are editable on the quotation itself without affecting the catalogue.

### 4.4 Non-Functional Requirements

**QT-NFR-01.** PDF generation must complete within 10 seconds. If it exceeds this, the user receives a "Generating — we'll notify you" message and the PDF is generated asynchronously.

**QT-NFR-02.** PDF files are stored in Supabase Storage under a private bucket. Access is via signed URLs with a 1-hour expiry.

### 4.5 Edge Cases & Business Rules

- If the Service Catalogue price is updated after a quotation is created, the existing quotation line items are unaffected (historical preservation).
- A quotation can be linked to at most one enquiry, but an enquiry can have multiple quotation versions across its lifecycle.
- Sending a quotation via Gmail requires an active Gmail OAuth connection. If not connected, the UI must guide the user to Settings > Gmail Integration.

### 4.6 Acceptance Criteria

- [ ] Quotation number is auto-generated following DOCNUM rules.
- [ ] Editing a sent quotation creates a new version; both versions are accessible.
- [ ] PDF contains all required fields and is correctly branded.
- [ ] "Send via Gmail" delivers the PDF to the client's email.
- [ ] Expired quotations display the expired indicator without status mutation.

### 4.7 Dependencies
- Module 02 (Clients), Module 08 (Service Catalogue), Module 10 (Settings — branding), Module 11 (Gmail), Module 04 (Bookings — conversion).

---

## 5. Module 04 — Bookings & Events

### 5.1 Purpose & Business Value
Manages confirmed bookings, each of which may consist of multiple events (e.g., a wedding package with haldi, mehendi, ceremony, and reception events). Tracks crew assignments, schedules, and all associated logistical details.

### 5.2 User Roles & Permissions

| Role | Bookings | Events | Crew Assignments |
|---|---|---|---|
| SysAdmin / Business Owner | Full CRUD | Full CRUD | Full CRUD |
| Manager | Create, Read, Update | Create, Read, Update | Create, Read, Update |
| Accountant | Read | Read | Read |
| Staff | Read | Read | — |
| Crew Member | Read (own) | Read (own) | Read (own) |

### 5.3 Functional Requirements

**BK-01.** A booking is the top-level record. It must capture: booking number (auto-generated), client, source enquiry (optional), source quotation (optional), status, total contracted amount (paisa), notes, `created_at`.

**BK-02.** Booking statuses: `confirmed` → `in_progress` → `completed` | `cancelled`.

**BK-03.** A booking contains one or more **events**. Each event must capture: event type (wedding, pre-wedding, portrait, corporate, birthday, other), event name, event date, start time, end time, venue name, venue address, specific requirements, assigned crew members, assigned equipment notes.

**BK-04.** An event must have at least one crew member assigned. The UI must warn but not block if an event is saved without crew.

**BK-05.** Crew assignment to an event must check for scheduling conflicts: if the same crew member is assigned to two overlapping events, a conflict warning must be displayed. The assignment must still be saveable with an explicit override confirmation.

**BK-06.** The booking detail page must display: booking summary, all events (sorted by date), crew assignments per event, linked quotation(s), linked invoice(s), delivery pipeline status.

**BK-07.** A booking calendar view must display all events on a monthly/weekly/day calendar. Events must be colour-coded by event type.

**BK-08.** Cancelling a booking requires a cancellation reason. Cancelled bookings are retained; associated invoices remain. A cancellation fee field is available on the cancellation form.

**BK-09.** A booking list view must support: search by client name or booking number, filter by status, filter by event type, filter by date range, sort by event date.

**BK-10.** When a booking is created from a quotation, all quotation line items are copied to the booking record for reference. Subsequent changes to the quotation do not affect the booking record.

**BK-11.** Booking deletion is only permitted for bookings in `confirmed` status (not yet in progress). Deletion is soft; it sets `deleted_at`.

**BK-12.** The system must generate an internal booking confirmation document (non-client-facing) summarising all event details, crew assignments, and venue information for internal use.

### 5.4 Non-Functional Requirements

**BK-NFR-01.** The booking calendar must render up to 100 events per month without performance degradation.

**BK-NFR-02.** Crew conflict detection must execute as a server-side check (not client-side only) before saving assignments.

### 5.5 Edge Cases & Business Rules

- A booking with a `cancelled` status must clearly show this state across all linked modules (invoices, delivery pipeline).
- An event date in the past does not automatically change booking status to `completed` — the Business Owner must explicitly mark it.
- A booking can be linked to multiple quotations (one per version/revision negotiation).

### 5.6 Acceptance Criteria

- [ ] Creating a booking from a quotation pre-populates event details.
- [ ] Crew conflict detection triggers when overlapping assignments are detected.
- [ ] Booking calendar renders all events for the month with correct colour coding.
- [ ] Cancelling a booking requires a cancellation reason and logs to audit.
- [ ] Crew Member can only view their own assigned events.

### 5.7 Dependencies
- Module 02 (Clients & Enquiries), Module 03 (Quotations), Module 07 (Crew), Module 09 (Delivery).

---

## 6. Module 05 — Invoices & Payments

### 6.1 Purpose & Business Value
Manages the full billing lifecycle: generating invoices, recording partial and full payments, issuing receipts, and tracking outstanding balances. Eliminates manual billing processes.

### 6.2 User Roles & Permissions

| Role | Invoices | Payments | Receipts |
|---|---|---|---|
| SysAdmin / Business Owner | Full CRUD; send via Gmail | Full CRUD | Generate; send |
| Manager | Read | — | — |
| Accountant | Full CRUD; send via Gmail | Full CRUD | Generate; send |
| Staff / Crew Member | No access | No access | — |

### 6.3 Functional Requirements

**INV-01.** An invoice must capture: invoice number (auto-generated per DOCNUM), booking reference, client, issue date, due date, line items (identical structure to quotations), discount, subtotal, tax (GST when enabled), total, notes to client, internal notes, status.

**INV-02.** Invoice statuses: `draft` → `sent` → `partially_paid` → `paid` | `overdue` | `cancelled`.

**INV-03.** `overdue` is a computed display status: a `sent` or `partially_paid` invoice whose due date has passed is displayed as overdue. The underlying stored status does not change automatically.

**INV-04.** Line items on an invoice are independent of the quotation's line items (they may differ due to changes in scope). The quotation's line items may be used as a starting point.

**INV-05.** A payment record must capture: linked invoice, payment date, amount (paisa), payment mode (cash, bank transfer, UPI, cheque, other), reference number, notes.

**INV-06.** Multiple payment records may be linked to one invoice (partial payment support). The outstanding balance is `invoice.total - sum(payments.amount)`.

**INV-07.** When the outstanding balance reaches zero (or is manually marked as `paid`), the invoice status must change to `paid`. This triggers an audit log entry.

**INV-08.** A receipt is generated for each payment record. Receipts have their own document number (RCP- series). The receipt must include: receipt number, payment date, amount, payment mode, invoice reference, booking reference, client details, studio details.

**INV-09.** "Send Invoice via Gmail" and "Send Receipt via Gmail" actions work identically to quotation sending (PDF attachment, configurable template body).

**INV-10.** A paid invoice is locked for editing. Any correction requires creating a credit note (a negative-value invoice) and a new corrected invoice. This workflow must be explicitly guided in the UI.

**INV-11.** Invoice list view must support: filter by status, filter by client, filter by date range, sort by due date. Overdue invoices must be visually highlighted.

**INV-12.** A "Payment Dashboard" section within this module must show: total invoiced, total collected, total outstanding, overdue amount.

**INV-13.** Bulk export of invoice data to CSV for a selected date range must be available to Business Owner and Accountant.

### 6.4 Non-Functional Requirements

**INV-NFR-01.** Invoice total must be recomputed server-side on every save and validated against the client-submitted total (zero tolerance on discrepancy).

**INV-NFR-02.** Payment recording must be transactional (atomic): the payment record and any resulting status update to the invoice must succeed or fail together.

### 6.5 Edge Cases & Business Rules

- A payment that overpays the invoice (amount > outstanding balance) must be warned at the UI level and blocked server-side unless the user explicitly overrides (e.g., intentional overpayment for advance).
- Invoices for cancelled bookings should still be manageable (a cancellation fee may still be invoiced).
- A `draft` invoice does not appear in financial reports; only `sent` and beyond statuses are counted.

### 6.6 Acceptance Criteria

- [ ] Invoice number auto-generated following DOCNUM rules.
- [ ] Partial payment correctly updates outstanding balance.
- [ ] Overdue invoices highlighted in list view.
- [ ] Paid invoice is locked; editing attempt prompts credit note workflow.
- [ ] Receipt generated and sendable for each payment.

### 6.7 Dependencies
- Module 04 (Bookings), Module 02 (Clients), Module 06 (Ledger), Module 11 (Gmail).

---

## 7. Module 06 — Ledger & Expenses

### 7.1 Purpose & Business Value
Provides a consolidated view of business income and expenditure, enabling basic P&L reporting, expense tracking, and financial decision-making without external accounting software.

### 7.2 User Roles & Permissions

| Role | Access |
|---|---|
| SysAdmin / Business Owner | Full CRUD; all reports |
| Accountant | Full CRUD; all reports |
| Manager / Staff / Crew Member | No access |

### 7.3 Functional Requirements

**LED-01.** An income entry is automatically created for each payment recorded in Module 05. Manual income entries may also be created for non-invoice income (e.g., tips, sundry income).

**LED-02.** An expense record must capture: date, category (equipment, travel, crew payment, marketing, software, rent, utilities, miscellaneous), description, amount (paisa), vendor/payee name, payment mode, reference number, receipt attachment (image/PDF stored in Supabase Storage), notes.

**LED-03.** Expense categories must be configurable in Settings (add/rename/archive categories; built-in categories cannot be deleted).

**LED-04.** A P&L report must be generatable for any date range, showing: total income, total expenses (by category), gross profit, with a category-wise expense breakdown table.

**LED-05.** A monthly summary chart must plot income vs. expenses by month for the selected financial year.

**LED-06.** Export P&L and expense records to CSV for the selected date range.

**LED-07.** The ledger view must display all income and expense entries in reverse-chronological order with filtering by: type (income/expense), category, date range, payment mode.

**LED-08.** Crew payments (from Module 07) must automatically create corresponding expense entries in the `crew_payment` category when recorded.

**LED-09.** An income entry linked to an invoice payment must be non-deletable independently; it is deleted only if the payment record is voided.

### 7.4 Edge Cases & Business Rules

- Manual income entries must carry a `source: manual` flag and be clearly distinguishable from invoice-linked income.
- Deleting an expense record is a soft delete; it is excluded from reports but retained in audit log.

### 7.5 Acceptance Criteria

- [ ] P&L report correctly aggregates income and expenses for the selected period.
- [ ] Invoice payment creates automatic income entry.
- [ ] Expense with receipt attachment uploads and links correctly.
- [ ] Monthly chart renders income vs. expenses correctly.
- [ ] CSV export includes all required columns.

### 7.6 Dependencies
- Module 05 (Invoices & Payments), Module 07 (Crew — pay entries).

---

## 8. Module 07 — Crew Management

### 8.1 Purpose & Business Value
Tracks all crew members (employees and freelancers), manages their assignments across events, maintains pay records, and provides availability visibility for scheduling.

### 8.2 User Roles & Permissions

| Role | Crew Profiles | Assignments | Pay Records |
|---|---|---|---|
| SysAdmin / Business Owner | Full CRUD | Full CRUD | Full CRUD |
| Manager | Full CRUD | Full CRUD | Read |
| Accountant | Read | Read | Full CRUD |
| Staff / Crew Member | — | Read (own) | — |

### 8.3 Functional Requirements

**CREW-01.** A crew member profile must capture: full name, role/designation (photographer, videographer, drone operator, editor, coordinator, etc.), phone, email, type (employee / freelancer), daily rate or per-event rate (paisa), bank account details (encrypted at rest), portfolio link, notes, `active` flag.

**CREW-02.** Crew members may be assigned a user account (if they need platform access) or exist as profile-only records (no login access).

**CREW-03.** An availability calendar must display all assigned events for each crew member. The crew list view must support filtering by role and availability on a given date.

**CREW-04.** A pay record must capture: crew member, booking/event reference, work date(s), agreed amount (paisa), amount paid (paisa), payment date, payment mode, status (unpaid / partially_paid / paid), notes.

**CREW-05.** Recording a crew payment must create a corresponding expense entry in Module 06 under the `crew_payment` category automatically.

**CREW-06.** A crew member's profile must display: all assignments (past and upcoming), total earnings (cumulative), payment history, and an availability summary.

**CREW-07.** The system must display a "Crew Availability" view for a given date range showing which crew members have no assigned events (available).

**CREW-08.** Deactivating a crew member (setting `active = false`) must not delete their historical assignments or pay records. They must not appear in assignment dropdowns for new events.

**CREW-09.** Bulk export of crew pay records for a date range to CSV (for accounting purposes).

### 8.4 Acceptance Criteria

- [ ] Crew profile created with all required fields.
- [ ] Pay record creation generates an automatic expense entry.
- [ ] Availability calendar shows no-conflict periods correctly.
- [ ] Deactivated crew members excluded from assignment dropdowns.

### 8.5 Dependencies
- Module 04 (Bookings & Events — assignments), Module 06 (Ledger — expense entries).

---

## 9. Module 08 — Service Catalogue

### 9.1 Purpose & Business Value
Maintains a master list of services and packages offered by the studio, with pricing, used as a reference for quotation and invoice line items. Historical prices are preserved to ensure past document integrity.

### 9.2 Functional Requirements

**SVC-01.** A service entry must capture: name, category (photography, videography, drone, album, editing, travel, miscellaneous), description, unit (per event, per day, per hour, per unit), unit price (paisa), `active` flag, `created_at`, `updated_at`.

**SVC-02.** A package is a named bundle of service entries with a bundled price (which may differ from the sum of individual prices).

**SVC-03.** Price update mechanism: updating a service's price must create a new price record with an effective date, retaining all historical price records. Existing quotations and invoices that reference this service must continue to reflect the price at the time of their creation.

**SVC-04.** The catalogue list must support: filter by category, filter by active/archived, sort by name, sort by price.

**SVC-05.** Archiving a service (setting `active = false`) does not delete it; it is hidden from the quotation line-item picker but remains on historical documents.

**SVC-06.** The catalogue must be importable from CSV (SysAdmin/Business Owner only) for bulk setup.

### 9.3 Edge Cases

- If a service is archived after being added to a draft quotation, the quotation must retain the line item with a "Service archived" indicator, but the price remains as entered.

### 9.4 Acceptance Criteria

- [ ] Price update creates historical price record; old quotations retain original price.
- [ ] Archived services excluded from quotation picker.
- [ ] Package bundled price is used (not sum of line items) in quotations.

### 9.5 Dependencies
- Module 03 (Quotations), Module 05 (Invoices).

---

## 10. Module 09 — Delivery Management

### 10.1 Purpose & Business Value
Tracks the post-event production pipeline for each booking, ensuring nothing falls through the cracks between shoot day and final delivery.

### 10.2 Functional Requirements

**DEL-01.** Each booking has exactly one delivery pipeline record. The pipeline has 9 stages:

| Stage # | Stage Name | Description |
|---|---|---|
| 1 | Raw Import | Raw footage/photos imported and backed up |
| 2 | Culling | Best shots selected from raw material |
| 3 | Editing | Photo editing / video rough cut |
| 4 | Client Preview | Preview shared with client for feedback |
| 5 | Revisions | Client feedback incorporated |
| 6 | Final Export | Final files exported at delivery quality |
| 7 | Quality Check | Internal QC of final exports |
| 8 | Delivery | Files delivered to client (drive/link) |
| 9 | Completed | Client confirmed receipt; job closed |

**DEL-02.** Each stage must capture: status (pending / in_progress / completed / blocked), assigned staff member(s), start date, completion date, notes, attachments (file links from Supabase Storage).

**DEL-03.** Stage progression is sequential by default; a stage cannot be marked `completed` unless the previous stage is also `completed`, unless overridden by Business Owner or SysAdmin.

**DEL-04.** The delivery pipeline view for a booking must show all 9 stages in a visual progress tracker (stepper/timeline UI).

**DEL-05.** A `blocked` stage requires a blocking reason. Blocked stages surface on the Dashboard as alerts.

**DEL-06.** Delivery deadlines: a target completion date may be set per booking. The system must flag bookings where the pipeline is behind schedule (stage completion dates exceed the target date).

**DEL-07.** Staff assigned to a stage can update that stage's status and add notes. They cannot modify other stages or other bookings' pipelines.

**DEL-08.** A delivery summary report must be exportable per booking, listing all stages, completion dates, and responsible staff.

### 10.3 Acceptance Criteria

- [ ] Pipeline correctly enforces sequential stage progression.
- [ ] Blocked stages appear as dashboard alerts.
- [ ] Staff can only update stages they are assigned to.
- [ ] Delivery summary report exports correctly.

### 10.4 Dependencies
- Module 04 (Bookings), Module 07 (Crew/Staff assignments).

---

## 11. Module 10 — Settings & Configuration

### 11.1 Purpose & Business Value
Provides a centralised administration panel for all runtime-configurable aspects of the platform, eliminating the need for code changes to update business information, branding, or operational parameters.

### 11.2 User Roles & Permissions

| Setting Category | SysAdmin | Business Owner | Others |
|---|---|---|---|
| Business Profile | RW | RW | — |
| Branding (logo, colours) | RW | RW | — |
| Email Templates | RW | RW | — |
| Document Numbering | RW | — | — |
| GST Configuration | RW | RW | — |
| User Management | RW | — | — |
| Integrations (Gmail OAuth) | RW | RW | — |
| Expense Categories | RW | RW | — |
| System / Technical | RW | — | — |

### 11.3 Functional Requirements

**SET-01.** Business Profile: studio name, tagline, address, phone, email, website, GST number (optional), PAN number (optional), bank account details for invoice footer, social media links.

**SET-02.** Branding: upload studio logo (PNG/SVG, stored in Supabase Storage); primary and secondary brand colours (hex picker); letterhead layout selection; email signature.

**SET-03.** Email Templates: configurable subject line and body for: quotation email, invoice email, receipt email, payment reminder email. Templates support merge tags (`{{client_name}}`, `{{document_number}}`, `{{amount}}`, etc.).

**SET-04.** Document Numbering: prefix, year format (YYYY / YY), sequence padding width, and financial year start month (default: April) configurable per document type (quotation, invoice, receipt).

**SET-05.** User Management: invite new users, assign roles, deactivate/reactivate users, resend invitations, view last login timestamp for each user.

**SET-06.** Gmail Integration: initiate OAuth 2.0 connection flow; view connected account; disconnect account; test connection (send test email).

**SET-07.** GST Configuration: enable/disable GST; configure GSTIN; configure default GST rates (CGST %, SGST %, IGST %); configure HSN/SAC codes per service category.

**SET-08.** Expense Categories: add, rename, archive custom categories. Built-in categories (equipment, travel, crew_payment, marketing, software, rent, utilities, miscellaneous) cannot be deleted.

**SET-09.** All settings changes must be logged in the audit log with before/after values.

### 11.4 Acceptance Criteria

- [ ] Logo uploaded via Settings appears correctly in PDF documents.
- [ ] Email template merge tags resolve correctly in sent emails.
- [ ] GST toggle shows/hides GST fields across quotation and invoice modules.
- [ ] User invite generates a valid single-use token that expires after 72 hours.

### 11.5 Dependencies
- Module 11 (Gmail OAuth), Module 03 (Quotations — PDF branding), Module 05 (Invoices — PDF branding).

---

## 12. Module 11 — Gmail Integration

### 12.1 Purpose & Business Value
Enables document delivery (quotations, invoices, receipts) directly from the platform using the studio's own Gmail account, so sent emails appear in the studio's Sent folder and maintain professional consistency.

### 12.2 Functional Requirements

**GMAIL-01.** The platform must implement Google OAuth 2.0 with the `gmail.send` scope. The `gmail.readonly` scope must not be requested (minimum privilege).

**GMAIL-02.** OAuth tokens (access token and refresh token) must be stored encrypted at rest in the database, not in environment variables or plaintext.

**GMAIL-03.** Access tokens must be automatically refreshed using the refresh token before they expire. If refresh fails, the Business Owner must be notified via an in-app banner to re-authenticate.

**GMAIL-04.** Only one Gmail account may be connected at a time per platform instance.

**GMAIL-05.** Emails sent via the integration must include: To (client email), From (connected Gmail account), Subject (from template), Body (HTML, from template with resolved merge tags), Attachment (PDF — inline, not as a link).

**GMAIL-06.** A "Send Email" action must display a preview modal showing the resolved subject, body, and attachment before sending. The user must confirm before the email is dispatched.

**GMAIL-07.** Each sent email must be recorded in the activity feed of the relevant client record, including: timestamp, recipient, document type, document number, actor.

**GMAIL-08.** If the Gmail API returns an error, the user must receive a clear error message with guidance. The email must not be silently dropped.

**GMAIL-09.** Disconnecting Gmail (from Settings) must revoke the OAuth token via the Google token revocation endpoint and delete the stored tokens.

### 12.3 Non-Functional Requirements

**GMAIL-NFR-01.** The Gmail send operation must be idempotent at the application level: a duplicate send attempt (e.g., double-click) must be detected and blocked using a debounce and server-side idempotency check.

**GMAIL-NFR-02.** Token storage must use Supabase Vault or column-level encryption. Tokens must never appear in API responses or logs.

### 12.4 Acceptance Criteria

- [ ] OAuth flow completes and tokens are stored encrypted.
- [ ] Token refresh works silently before expiry.
- [ ] Send preview modal shows resolved template correctly.
- [ ] Email appears in Gmail Sent folder after sending.
- [ ] Disconnect revokes token via Google API.

### 12.5 Dependencies
- Module 10 (Settings — OAuth configuration), Module 03 (Quotations), Module 05 (Invoices).

---

## 13. Module 12 — Public Website

### 13.1 Purpose & Business Value
Provides a professional brand presence for VOWS Studio on the public internet, showcasing portfolio work, services, pricing, and client testimonials — and capturing inbound enquiries directly into the platform's enquiry pipeline.

### 13.2 Functional Requirements

**WEB-01.** The public website consists of the following pages: Home, Portfolio, Services, Pricing, About, Contact/Enquiry, Reviews/Testimonials.

**WEB-02.** All public website content (copy, images, services displayed, pricing) is manageable from the Settings & Configuration module. No code changes are required to update content.

**WEB-03.** Portfolio gallery: images and videos managed via the platform are selectable for public display. Categorised by event type (wedding, pre-wedding, portrait, etc.). Images must use `next/image` for optimised delivery.

**WEB-04.** Services and Pricing page: pulls directly from the Service Catalogue (active services/packages with `show_on_website = true`).

**WEB-05.** The enquiry form on the Contact page must capture: name, phone, email, event type, event date, message, referral source. On submission, it creates a new enquiry record in Module 02 with status `new`.

**WEB-06.** CAPTCHA (or honeypot) must be implemented on the enquiry form to prevent spam submissions.

**WEB-07.** Reviews/Testimonials page displays approved reviews from Module 13.

**WEB-08.** The website must have a sitemap.xml and robots.txt generated dynamically.

**WEB-09.** All pages must have configurable meta title, meta description, and Open Graph tags manageable from the Settings module.

**WEB-10.** The website must implement Next.js static generation (SSG) or ISR for pages whose content changes infrequently (portfolio, services, reviews), and server-side rendering (SSR) for the enquiry form page.

**WEB-11.** A cookie consent banner must be displayed on the first visit (GDPR/Indian IT rules compliance for cookies used in analytics, if any).

### 13.3 SEO Requirements

**SEO-01.** Every page must have a unique, descriptive `<title>` tag and `<meta name="description">` tag.

**SEO-02.** Structured data (JSON-LD) must be implemented for: Local Business (on Home page), Service (on Services page), Review (on Testimonials page).

**SEO-03.** Canonical URLs must be set on all pages to prevent duplicate content issues.

**SEO-04.** Image alt text must be descriptive and present on all portfolio images.

**SEO-05.** Core Web Vitals targets on mobile: LCP < 2.5s, CLS < 0.1, INP < 200ms.

**SEO-06.** Lighthouse SEO score ≥ 90 in Vercel deployment pipeline CI check.

### 13.4 Non-Functional Requirements

**WEB-NFR-01.** The public website must be accessible independently of the internal app — a backend downtime should not take down the public website (use ISR/SSG where possible).

**WEB-NFR-02.** Portfolio images must be served via Supabase CDN and next/image with appropriate `sizes` and `srcset` for responsive delivery.

### 13.5 Acceptance Criteria

- [ ] Enquiry form submission creates enquiry record in Module 02.
- [ ] Portfolio images load with correct optimisation (next/image).
- [ ] sitemap.xml and robots.txt are accessible and correctly formed.
- [ ] Lighthouse SEO score ≥ 90 in CI.
- [ ] Structured data validates in Google Rich Results Test.

### 13.6 Dependencies
- Module 02 (Enquiries — form submission), Module 08 (Service Catalogue — pricing display), Module 13 (Reviews — testimonials), Module 10 (Settings — content management).

---

## 14. Module 13 — Feedback & Reviews

### 14.1 Purpose & Business Value
Collects post-delivery client feedback, allows the studio to moderate responses, and publishes approved testimonials on the public website — building social proof and trust.

### 14.2 Functional Requirements

**REV-01.** A review collection link (unique, time-limited URL) can be generated per booking and sent to the client manually (copy-to-clipboard) or via Gmail.

**REV-02.** The review submission page (public, no login required) must capture: overall rating (1–5 stars), categories (communication, quality, punctuality — 1–5 stars each), written testimonial, client name (pre-filled, editable), event type, event date.

**REV-03.** Review statuses: `pending` → `approved` | `rejected`.

**REV-04.** New review submissions must trigger an in-app notification for the Business Owner and SysAdmin.

**REV-05.** The review moderation panel (internal) must list all reviews with their status, allow viewing the full review, and allow approving or rejecting with an optional internal note.

**REV-06.** Only `approved` reviews are displayed on the public website's Testimonials page.

**REV-07.** An approved review may be re-hidden (set back to `pending`) by the Business Owner without deletion. This is logged in the audit log.

**REV-08.** The aggregate rating (average of all approved reviews) must be computed and displayed on the public website and the internal dashboard.

**REV-09.** Review collection links expire after 30 days from generation. A new link can be generated per booking.

**REV-10.** A client cannot submit more than one review per booking (enforced by the unique booking token).

### 14.3 Acceptance Criteria

- [ ] Review submission link is unique per booking and expires after 30 days.
- [ ] Submitting a review creates a `pending` record visible in moderation panel.
- [ ] Only approved reviews appear on the public website.
- [ ] Duplicate submission attempt on the same booking token is blocked.
- [ ] Aggregate rating updates correctly when a review is approved or hidden.

### 14.4 Dependencies
- Module 04 (Bookings — link generation), Module 12 (Public Website — testimonials display), Module 11 (Gmail — link delivery).

---

*End of Requirements Specification — VOWS Studio Platform v1.0*
