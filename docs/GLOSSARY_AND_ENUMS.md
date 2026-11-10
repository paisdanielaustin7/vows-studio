# VOWS Studio — Glossary, Canonical Enums and Conventions

> **Status:** Draft for review · **Date:** 2026-11-09 · **Companion:** `DECISION_LOG.md`
> **Purpose:** One vocabulary for all documents and all code. If a value here conflicts with documents 01–08, **this file wins**. Enum values below are the exact strings stored in the database and used in Zod schemas.

---

## 1. Terms

| Term | Meaning |
|---|---|
| **Studio** | The single business using the platform (single-tenant). |
| **Enquiry** | A prospective job. May exist before any client record (guest contact details). |
| **Client** | A person or couple with a stored profile. Created explicitly from an enquiry or manually. |
| **Quotation** | An offer with line items and totals. Identified by one number and one or more **versions**. |
| **Booking** | A confirmed job. Contains one or more **events**. Holds the delivery pipeline. |
| **Event** | A dated shoot within a booking (for example mehendi, wedding, reception). |
| **Invoice** | A request for payment tied to a booking. A booking may have several (advance, final). |
| **Payment** | Money received. Immutable. Allocated in full to one or more invoices. |
| **Allocation** | The part of a payment applied to one invoice. |
| **Receipt** | Document issued for one payment. |
| **Credit note** | Document that reduces an issued invoice, used when an invoice with payments needs correcting. |
| **Void** | Reversing a payment with a reason. Never delete or edit. |
| **Derived status** | A status computed at read time, never stored (`overdue`, `expired`). |
| **Delivery pipeline** | The 9-stage post-shoot process for one booking. |
| **Deliverable link** | External URL (for example Google Drive) where finished work is hosted. Media is not stored in Supabase. |
| **Sender account** | The single connected Gmail account used to send documents. |
| **Override** | An explicit, logged confirmation to proceed past a warning (crew conflict, role-restricted stage skip). |
| **Paise** | 1/100 INR. All money is stored as integer paise. |
| **Basis points (bps)** | 1/100 of a percent. 18% = 1800 bps. |
| **FY** | Indian financial year (April–March), labelled by its starting year. 15 May 2026 → FY 2026. |
| **Demo mode** | Separate deployment with synthetic data (Lumina Studio). |

---

## 2. Roles

| `user_role` value | Display name | MFA | Notes |
|---|---|---|---|
| `system_admin` | System Administrator | **Required** | Seeded only. Cannot be created or granted through the app. |
| `business_owner` | Business Owner | **Required** | Created by invitation. |
| `manager` | Manager | Optional | Operations, no ledger or revenue figures. |
| `accountant` | Accountant | Optional | Invoices, payments, ledger, expenses. |
| `staff` | Staff | Optional | Limited operations, assigned delivery stages. |
| `crew_member` | Crew Member | Optional | Read-only, own assignments. Landing page `/crm/schedule`. |

The base permission matrix is Requirements AUTHZ-05. The RBAC document will expand it to action level.

---

## 3. Status enums

Stored statuses are in the database. Derived statuses are computed and must never be persisted.

| Enum | Stored values | Derived / reserved |
|---|---|---|
| `enquiry_status` | `new`, `contacted`, `quoted`, `negotiating`, `converted`, `lost`, `junk` | — |
| `quotation_status` | `draft`, `sent`, `accepted`, `rejected`, `superseded` | `expired` (derived: `sent` past `valid_until`); `viewed` reserved, unused in V1 |
| `booking_status` | `confirmed`, `in_progress`, `completed`, `cancelled` | — |
| `invoice_status` | `draft`, `sent`, `partially_paid`, `paid`, `cancelled` | `overdue` (derived: `sent` or `partially_paid` past due date) |
| `credit_note_status` | `issued`, `cancelled` | — |
| `payment_status` | `recorded`, `voided` | — |
| `delivery_stage_status` | `pending`, `in_progress`, `completed`, `blocked` | `behind_schedule` (derived against target date) |
| `review_status` | `pending`, `approved`, `rejected` | `expired_link` (derived from token age) |
| `crew_pay_status` | `unpaid`, `partially_paid`, `paid` | — |
| `follow_up_status` | `open`, `done` | `overdue` (derived) |
| `email_send_status` | `sent`, `failed` | — |
| `gmail_connection_status` | `connected`, `needs_reconnect`, `disconnected` | — |
| `invitation_status` (derived from columns) | — | `pending`, `accepted`, `expired`, `revoked` |

Allowed transitions are defined in BUSINESS_WORKFLOWS.

---

## 4. Domain enums

| Enum | Values |
|---|---|
| `event_type` | `wedding`, `pre_wedding`, `engagement`, `mehendi`, `haldi`, `reception`, `portrait`, `birthday`, `corporate`, `other` |
| `enquiry_source` (also client `referral_source`) | `website`, `instagram`, `facebook`, `google`, `referral`, `walk_in`, `other` |
| `crew_role` | `photographer`, `videographer`, `drone_operator`, `editor`, `assistant`, `coordinator`, `other` |
| `crew_type` | `employee`, `freelancer` |
| `event_assignment_role` | `lead_photographer`, `second_photographer`, `lead_videographer`, `second_videographer`, `drone_operator`, `assistant`, `coordinator`, `other` |
| `payment_method` | `cash`, `upi`, `bank_transfer`, `cheque`, `other` |
| `service_category` | `photography`, `videography`, `drone`, `album`, `editing`, `travel`, `miscellaneous` |
| `service_unit` | `per_event`, `per_day`, `per_hour`, `per_unit` |
| `discount_type` | `percent`, `fixed` |
| `document_type` | `quotation`, `invoice`, `receipt`, `booking`, `credit_note` |
| `delivery_stage_code` | see §5 |
| `audit_action` | `create`, `update`, `soft_delete`, `restore`, `delete`, `login_success`, `login_failure`, `mfa_success`, `mfa_failure`, `password_change`, `password_reset`, `role_change`, `lockout`, `unlock`, `gst_toggle`, `gmail_connect`, `gmail_disconnect`, `data_reset`, `setup_lock` |
| `tax_type` (when GST on) | `cgst_sgst`, `igst` |

**Expense categories** are a configurable table (`expense_categories`, SET-08). Built-in rows that cannot be deleted: `equipment`, `travel`, `crew_payment` (system-created only), `marketing`, `software`, `rent`, `utilities`, `miscellaneous`.

---

## 5. Delivery pipeline stages

| # | `delivery_stage_code` | Name |
|---|---|---|
| 1 | `raw_import` | Raw Import |
| 2 | `culling` | Culling |
| 3 | `editing` | Editing |
| 4 | `client_preview` | Client Preview |
| 5 | `revisions` | Revisions |
| 6 | `final_export` | Final Export |
| 7 | `quality_check` | Quality Check |
| 8 | `delivery` | Delivery |
| 9 | `completed` | Completed |

---

## 6. Document numbering

| Document | Prefix | Example (first of FY 2026) |
|---|---|---|
| Quotation | `QT` | `QT-2026-000001` (versions shown as `v2`, `v3`) |
| Invoice | `INV` | `INV-2026-000001` |
| Receipt | `RCP` | `RCP-2026-000001` |
| Booking | `BK` | `BK-2026-000001` |
| Credit note | `CN` | `CN-2026-000001` |

Pattern `{PREFIX}-{FY}-{NNNNNN}`. Prefix, padding and FY start month are SysAdmin-configurable and affect new documents only.

---

## 7. Resources and actions (for RBAC)

**Permission string format:** `resource:action`, for example `invoices:create`.

**Resources:** `users`, `audit_log`, `business_settings`, `integrations`, `clients`, `enquiries`, `follow_ups`, `quotations`, `quotation_templates`, `bookings`, `events`, `crew`, `crew_pay`, `services`, `packages`, `invoices`, `payments`, `receipts`, `credit_notes`, `ledger`, `expenses`, `delivery`, `reviews`, `portfolio`, `site_content`, `notifications`, `dashboard`, `reports`, `data_reset`.

**Actions:** `view`, `create`, `update`, `delete` (soft where applicable), `send`, `export`, `approve` (for example accept a quotation), `void`, `override`, `manage` (administrative actions such as user and role management).

Own-record rules (crew seeing only their own assignments, staff seeing only assigned delivery stages) are expressed as scoped variants in the RBAC document, for example `bookings:view:own`.

---

## 8. Conventions

| Topic | Rule |
|---|---|
| Money | `bigint` paise, suffix `_paise`. Only `lib/money` performs arithmetic. |
| Rates / percentages | `integer` basis points, suffix `_bps`. |
| Rounding | Round-half-up to the paisa. |
| Timestamps | `timestamptz`, suffix `_at`, stored in UTC. |
| Dates | `date`, suffix `_date`, interpreted in `Asia/Kolkata`. |
| Booleans | Prefix `is_` or `has_`. |
| Keys | `uuid` primary keys. |
| Database names | snake_case, tables plural. |
| TypeScript / JSON | camelCase fields. |
| Schemas | One Zod schema per domain in `lib/validations/<domain>.schema.ts`, shared by client and server. |
| API / action result | `{ data, error }` with error codes from the API error table (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `UNPROCESSABLE`, `RATE_LIMITED`, `INTERNAL_ERROR`). |
| Spelling | "Paise" (not "paisa"), "quotation" (not "quote") in code and data. |

---

## 9. Environment variables (canonical names)

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Service role (restricted uses, see Decision D-12) |
| `NEXT_PUBLIC_APP_URL` | public | Canonical app URL |
| `APP_MODE` | server only | `production` or `demo` |
| `NEXT_PUBLIC_APP_MODE` | public | Mirrors `APP_MODE` for the demo banner only |
| `ALLOWED_SUPABASE_PROJECT_REF` | server only | Boot guard: refuses to start if the connected project does not match the mode |
| `GOOGLE_CLIENT_ID` | server only | Gmail OAuth |
| `GOOGLE_CLIENT_SECRET` | server only | Gmail OAuth |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | server only | AES-256-GCM key for stored Gmail tokens |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server only | Rate limiting |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | Bot protection widget |
| `TURNSTILE_SECRET_KEY` | server only | Bot protection verification |
| `CRON_SECRET` | server only | Protects cron routes (demo reset, expiry jobs) |

Retired names: `ENCRYPTION_KEY`, `PDF_ENCRYPTION_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_DEMO_MODE`.

---

## 10. Storage buckets

`portfolio` (public), `branding` (public), `documents` (private, generated PDFs), `client-uploads` (private), `expense-receipts` (private), `crew-assets` (private). Size limits are in Decision D-29.
