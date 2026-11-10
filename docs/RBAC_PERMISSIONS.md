# VOWS Studio — RBAC & Permissions

> **Status:** Draft for review · **Date:** 2026-11-10 · **Depends on:** `DECISION_LOG.md` (D-01, D-02, D-05, D-12, D-13), `GLOSSARY_AND_ENUMS.md` §2, §7
> **Base source:** Requirements AUTHZ-05 and the per-module role tables. Where those tables were silent, the ruling is stated and marked **(ruling)**.

---

## 1. Principles

1. **Default deny.** Every table has RLS enabled. A table without a matching policy is unreadable and unwritable for all non-service roles.
2. **RLS is the primary gate** (AUTHZ-02). Server Actions and Route Handlers re-check permissions as a second layer and for friendly errors.
3. **One role per user** (`profiles.role`). No composite roles, no per-user overrides in V1.
4. **No self-elevation.** Only `system_admin` can change roles. `system_admin` can never be assigned through the app.
5. **MFA-gated privilege.** `system_admin` and `business_owner` policies additionally require an `aal2` session (see §7).
6. **Money is need-to-know.** Roles without financial access see operational data through money-free views (see §5).
7. **Client privacy toward crew.** Crew see event logistics, not client contact details (see §5).
8. **Deactivated means locked out** everywhere, immediately (D-05).

---

## 2. Roles

| Role | Summary |
|---|---|
| `system_admin` (SA) | Technical owner. Everything, including users, numbering configuration and the full audit log. |
| `business_owner` (BO) | Runs the business. All business modules and financials. No user management, no numbering configuration, no technical panels. |
| `manager` (MG) | Operations: enquiries, quotations, bookings, crew, delivery. Sees invoices (read) but no payments, ledger or revenue figures. |
| `accountant` (AC) | Finance: invoices, payments, receipts, credit notes, ledger, expenses, crew pay. Read-only on bookings, clients and quotations. |
| `staff` (ST) | Read access to clients, enquiries, bookings, catalogue. Updates delivery stages they are assigned to. No financial data. |
| `crew_member` (CR) | Read-only, own assignments and schedule only. |

---

## 3. Permission matrix (action level)

**Legend:** ✓ allowed · — denied · **own** only own records · **asg** only assigned items · **v** view, **c** create, **u** update, **d** delete (soft where applicable), **s** send via email, **x** export CSV.

### 3.1 Identity, system and settings

| Resource | SA | BO | MG | AC | ST | CR |
|---|---|---|---|---|---|---|
| `users:manage` (invite, role, deactivate, unlock, resend) | ✓ | — | — | — | — | — |
| `users:update:self` (name, avatar, password, MFA) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `audit_log:view` | all | business records only | — | — | — | — |
| `business_settings` profile, branding, billing/GST config, expense categories, email templates, website settings | v c u | v c u | — | — | — | — |
| Document numbering configuration | v u | — | — | — | — | — |
| `integrations` (Gmail connect, change, disconnect, test) | ✓ | ✓ | — | — | — | — |
| `system` panel (health, security settings) | ✓ | — | — | — | — | — |
| `data_reset:manage` (dry run, reset, load sample data, lock setup). Only while `setup_mode` is true in production; always in demo. Requires `aal2`, password re-entry, typed phrase. | ✓ | — | — | — | — | — |
| `notifications` | own | own | own | own | own | own |

### 3.2 Sales and operations

| Resource | SA | BO | MG | AC | ST | CR |
|---|---|---|---|---|---|---|
| `clients` | v c u d x | v c u d x | v c u x | v | v | — |
| `enquiries` | v c u d x | v c u d x | v c u d x | v | v | — |
| `follow_ups` | v c u d | v c u d | v c u d | v | — | — |
| `quotations` (incl. versions, accept/reject) | v c u d s approve | v c u d s approve | v c u s approve | v | — | — |
| `quotation_templates` | v c u d | v c u d | v c u d | v | — | — |
| `bookings` | v c u d | v c u d | v c u | v | v (no money) | own (no money) |
| `bookings:cancel`, `bookings:reopen` | ✓ | ✓ | cancel only | — | — | — |
| `events` | v c u d | v c u d | v c u | v | v (no money) | own |
| Crew assignment to events | v c u d | v c u d | v c u | v | — | own (v) |
| Crew conflict `override` | ✓ | ✓ | ✓ | — | — | — |
| `crew` profiles | v c u d | v c u d | v c u d | v | — | own (v) |
| `crew` bank details | v c u | v c u | — | v | — | — |
| Crew unavailability | v c u d | v c u d | v c u d | v | — | own (v) |
| `crew_pay` records and payments | v c u | v c u | v | v c u | — | — |
| `services`, `packages`, prices | v c u d | v c u d | v | v | v | — |
| `delivery` pipelines and stages | v c u d | v c u d | v c u | — | v; u **asg** | own (v) |
| Delivery stage skip/undo `override` | ✓ | ✓ | — | — | — | — |
| `reviews:request` (generate/send link) | ✓ | ✓ | ✓ | — | — | — |
| `reviews` moderate (approve, reject, re-hide) | ✓ | ✓ | — | — | — | — |
| `reviews:view` | ✓ | ✓ | v | — | — | — |
| `portfolio`, `site_content` | v c u d | v c u d | v | — | — | — |

### 3.3 Finance

| Resource | SA | BO | MG | AC | ST | CR |
|---|---|---|---|---|---|---|
| `invoices` | v c u d* s x | v c u d* s x | v | v c u d* s x | — | — |
| `payments` record, `void`, reallocate | ✓ | ✓ | — | ✓ | — | — |
| `receipts` generate, send | ✓ | ✓ | — | ✓ | — | — |
| `credit_notes` | v c u s | v c u s | — | v c u s | — | — |
| `ledger` view and export | ✓ | ✓ | — | ✓ | — | — |
| `expenses` | v c u d x | v c u d x | — | v c u d x | — | — |
| Manual income entries | v c u d | v c u d | — | v c u d | — | — |
| `reports` (P&L, outstanding, aging) | ✓ | ✓ | — | ✓ | — | — |

\* "d" on invoices means **cancel** an unpaid invoice. Invoices are never deleted (D-14, D-22). Cancelled drafts keep their number.

### 3.4 Dashboard widgets

| Widget group | SA | BO | MG | AC | ST | CR |
|---|---|---|---|---|---|---|
| Financial KPIs, revenue chart, overdue invoices | ✓ | ✓ | — | ✓ | — | — |
| Bookings, enquiries, events, crew, blocked-stage alerts | ✓ | ✓ | ✓ | — | — | — |
| Any dashboard | ✓ | ✓ | ✓ | ✓ | — | — |

Each widget is hidden on the server for roles outside its group (DASH-09). Hiding in the UI alone is insufficient.

### 3.5 Rulings where Requirements were silent or conflicted

| # | Ruling |
|---|---|
| R1 | **(ruling)** Staff read all clients, enquiries and bookings (AUTHZ-05). The Demo Plan's "staff sees assigned bookings only" is corrected. |
| R2 | **(ruling)** Manager may create clients (needed when converting enquiries) but not delete them. |
| R3 | **(ruling)** Manager sees an invoice's amounts and status but never payment records, the ledger or revenue totals. |
| R4 | **(ruling)** Accountant may view quotations and bookings but not change them. |
| R5 | **(ruling)** Catalogue (services, packages) is managed only by SA and BO. |
| R6 | **(ruling)** `reviews:request` is an operational action available to Manager. Moderation stays with SA and BO. |
| R7 | **(ruling)** Business Owner sees audit entries for business tables only, not for `profiles`, `invitations`, `auth_*` events or `gmail_credentials`. |

---

## 4. Own-record and assignment rules

| Rule | Definition |
|---|---|
| **Crew own** | A `crew_member` user maps to `crew_members.profile_id = auth.uid()`. They see events where `event_crew_assignments.crew_member_id` is theirs, the parent booking in money-free form, their own profile, unavailability, and the delivery stages of those bookings (read only). |
| **Staff assigned** | Staff may update a `delivery_stages` row only if present in `delivery_stage_assignees`. They cannot change another stage, another booking's pipeline, or the stage assignees. |
| **Notifications** | Each user sees and marks read only their own rows. |
| **Self profile** | Users update their own name and avatar, never `role`, `is_active` or `email`. |

---

## 5. Field-level and view-level protection

RLS filters rows, not columns, so sensitive column sets are exposed through views owned by a privileged role that filter with the helper functions in §7.

| Data | Protected from | Mechanism |
|---|---|---|
| Booking money (`contract_total_paise`, line items, cancellation fee) | ST, CR | Staff and crew read `bookings_ops_v` (no money columns). Base `bookings` readable by SA, BO, MG, AC only. |
| Client phone, email, address | CR | Crew read `crew_event_v`: event details, venue, client **display name** only. |
| Crew rates | ST, CR | Base `crew_members` rate columns readable by SA, BO, MG, AC; others use a rate-free view. |
| Crew bank details | MG, ST, CR | Stored encrypted (`bank_details_enc`). Decrypted only in server code for SA, BO, AC. Never selected by the browser client. |
| Business bank details and GSTIN | ST, CR, MG | `GET settings` returns public studio fields to all signed-in users and billing fields only to SA/BO. PDFs read them server-side. |
| Gmail tokens | everyone | `gmail_credentials` has no policy for any app role. Service role only (D-12). |
| Invitation tokens, review tokens | everyone | Stored hashed. Never returned after creation. |
| Audit log | MG, AC, ST, CR | Table policy; BO sees only the table-name allowlist in R7. |

---

## 6. Route access matrix

| Route prefix | Allowed roles | On denial |
|---|---|---|
| Public routes (`/`, `/portfolio`, `/services`, `/about`, `/contact`, `/reviews`, `/faq`, `/privacy`, `/terms`) | everyone | — |
| `/review/[token]`, `/delivery/[token]` | token holder | generic "link invalid or expired" |
| `/login`, `/forgot-password`, `/reset-password`, `/invite/[token]` | signed-out (redirect others to their landing page) | redirect |
| `/mfa`, `/mfa/enroll` | signed-in at `aal1` | redirect to `/login` |
| `/crm/dashboard` | SA, BO, MG, AC | 403 page |
| `/crm/schedule` | all signed-in roles (crew see own only) | — |
| `/crm/clients`, `/crm/enquiries` | SA, BO, MG, AC, ST | 403 page |
| `/crm/quotations` | SA, BO, MG, AC | 403 page |
| `/crm/bookings` | SA, BO, MG, AC, ST, CR (own) | 403 page |
| `/crm/crew` | SA, BO, MG, AC, CR (own profile only) | 403 page |
| `/crm/invoices`, `/crm/payments`, `/crm/ledger`, `/crm/expenses` | SA, BO, AC (invoices also MG, read-only) | 403 page |
| `/crm/services`, `/crm/packages` | SA, BO, MG, AC, ST (read-only except SA, BO) | 403 page |
| `/crm/delivery` | SA, BO, MG, ST, CR (own) | 403 page |
| `/crm/portfolio`, `/crm/reviews` | SA, BO, MG (read-only) | 403 page |
| `/crm/audit-log` | BO | 403 page |
| `/crm/settings/*` | SA, BO (numbering: SA only) | 403 page |
| `/admin/*` | SA at `aal2` | 403 page |

Landing page after login: `system_admin` → `/admin/dashboard`; `business_owner`, `manager`, `accountant` → `/crm/dashboard`; `staff` → `/crm/bookings`; `crew_member` → `/crm/schedule`.

**Denial behaviour (D-13):** a role that may never use a route gets a **403** page. A record hidden by own-record RLS returns **404** (indistinguishable from missing).

---

## 7. RLS implementation pattern

### 7.1 Helper functions (schema `app`, `SECURITY DEFINER`, `STABLE`, fixed `search_path`)

| Function | Returns | Logic |
|---|---|---|
| `app.role()` | `user_role` | JWT top-level claim `user_role` (set by the Custom Access Token Hook, D-05) |
| `app.aal2()` | boolean | JWT `aal = 'aal2'` |
| `app.is_active()` | boolean | `profiles.is_active` for `auth.uid()` (cached per statement) |
| `app.has_role(VARIADIC user_role[])` | boolean | `is_active()` AND role in list AND, if role is `system_admin` or `business_owner`, `aal2()` |
| `app.crew_id()` | uuid | `crew_members.id` where `profile_id = auth.uid()` |
| `app.assigned_to_event(event uuid)` | boolean | crew assigned to event |
| `app.assigned_to_stage(stage uuid)` | boolean | user in `delivery_stage_assignees` |

### 7.2 Policy naming and shape

`{table}__{action}__{roles}`, for example `invoices__select__sa_bo_mg_ac`.

```
USING / WITH CHECK  (app.has_role('system_admin','business_owner','accountant'))
```

Own-record example: `events__select__crew_own` using `app.has_role('crew_member') AND app.assigned_to_event(id)`.

### 7.3 Mandatory rules

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every table, plus `FORCE` on tables the service role should not casually bypass.
- No `UPDATE`/`DELETE` policy on `audit_log`, `payments` (only a void function), `payment_allocations`, `receipts`, issued `credit_notes` financial columns, `document_sequences`.
- `profiles` role protection trigger: rejects any change to `role` unless the actor is `system_admin` or a migration, and rejects any write that sets `role = 'system_admin'` from the application.
- Storage policies mirror table policies (bucket → allowed roles) and use signed URLs for private buckets.
- Public (anonymous) access exists only on: public storage buckets (read), and through Route Handlers that use the service role after validation. There are **no** anonymous table policies.

---

## 8. Mapping to application layers

| Layer | Responsibility |
|---|---|
| `lib/constants/permissions.ts` | Single map `role → Set<permission string>` generated from §3. Used by Server Actions (`requirePermission`) and by UI to show or hide controls. |
| Server Actions / Route Handlers | `getAuthenticatedUser()` → `requirePermission()` → Zod → database call. Return `FORBIDDEN` (403). |
| Middleware / route-protection layer | Session, MFA level and the route matrix in §6 only. No data decisions. |
| RLS | Final enforcement per §7. |
| UI | Hides what the role cannot use. Never the sole control. |

---

## 9. Role lifecycle rules

| Event | Rule |
|---|---|
| Invite | SA only. Role chosen from `business_owner`, `manager`, `accountant`, `staff`, `crew_member`. |
| Role change | SA only. Writes `role_change` audit entry. Revokes the user's sessions so the new role applies immediately. |
| Deactivate / reactivate | SA only. Deactivation revokes all sessions and blocks login. Records are retained (RETENTION-05). |
| MFA reset | SA only, for any user. A BO's MFA reset requires re-enrolment at next login and an audit entry. |
| Last-owner protection | The system must always have at least one active `business_owner` and one active `system_admin`. Deactivating the last one is rejected. |
| Crew user link | Linking a `crew_member` user to a `crew_members` profile is done by Manager, Owner or SA. |

---

## 10. Test requirements (feeds TESTING_PLAN)

- The matrix in §3 is the single source for a **generated RLS test suite**: for every table, role and action, assert allow or deny using real signed-in clients.
- Required negative tests: crew reading another crew's booking (expect 404/empty), staff reading `payments`, manager reading `ledger_entries_v`, accountant updating `bookings`, any role updating `profiles.role`, BO at `aal1` reading a BO-only table, a deactivated user with an unexpired token.
- Run in CI against the Supabase CLI instance (D-42).
