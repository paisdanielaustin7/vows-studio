# VOWS Studio — Database Schema

> **Status:** Draft for review · **Date:** 2026-11-10 · **Engine:** Supabase PostgreSQL
> **Depends on:** `DECISION_LOG.md`, `GLOSSARY_AND_ENUMS.md`, `RBAC_PERMISSIONS.md`
> **Notation:** Compact DDL-style. `pk` primary key, `fk→t` foreign key (default `ON DELETE RESTRICT`), `nn` not null, `ci` case-insensitive. All `id` columns are `uuid default gen_random_uuid()`. Every table has `created_at timestamptz nn default now()`; mutable tables also have `updated_at timestamptz nn default now()` maintained by trigger. Money is `bigint` `_paise`, rates `integer` `_bps` (D-16).

---

## 1. Conventions and global rules

1. **Money checks:** every `_paise` column has `CHECK (>= 0)` unless noted. Every document with totals has `CHECK (total_paise = subtotal_paise - discount_paise + tax_paise)` and `CHECK (taxable_paise = subtotal_paise - discount_paise)`.
2. **Item-sum trigger:** a deferred constraint trigger asserts `subtotal_paise = Σ item.line_total_paise` and (for GST) `Σ item tax = document tax` at commit. The server computes with `lib/money`; the database verifies (FIN-06).
3. **Soft delete** (`deleted_at timestamptz`) only where D-14 allows. Default queries filter `deleted_at IS NULL` through views or policies.
4. **Timezone:** timestamps UTC; `*_date` columns are IST calendar dates.
5. **Extensions:** `pgcrypto`, `pg_trgm`, `citext`, `btree_gist` (for time-range exclusion on crew if needed).
6. **Schemas:** `public` (data), `app` (helper functions, internal tables not exposed).
7. **Snapshots:** documents copy prices, tax rates and party details at creation so later catalogue or client edits never change them (SVC-03, QT-13).

---

## 2. Enums

```
user_role: system_admin, business_owner, manager, accountant, staff, crew_member
enquiry_status: new, contacted, quoted, negotiating, converted, lost, junk
quotation_status: draft, sent, accepted, rejected, superseded
booking_status: confirmed, in_progress, completed, cancelled
invoice_status: draft, sent, partially_paid, paid, cancelled
credit_note_status: issued, cancelled
payment_status: recorded, voided
delivery_stage_status: pending, in_progress, completed, blocked
review_status: pending, approved, rejected
crew_pay_status: unpaid, partially_paid, paid
follow_up_status: open, done
email_send_status: sent, failed
gmail_connection_status: connected, needs_reconnect, disconnected
event_type: wedding, pre_wedding, engagement, mehendi, haldi, reception, portrait, birthday, corporate, other
enquiry_source: website, instagram, facebook, google, referral, walk_in, other
crew_role: photographer, videographer, drone_operator, editor, assistant, coordinator, other
crew_type: employee, freelancer
event_assignment_role: lead_photographer, second_photographer, lead_videographer, second_videographer, drone_operator, assistant, coordinator, other
payment_method: cash, upi, bank_transfer, cheque, other
service_category: photography, videography, drone, album, editing, travel, miscellaneous
service_unit: per_event, per_day, per_hour, per_unit
discount_type: percent, fixed
document_type: quotation, invoice, receipt, booking, credit_note
delivery_stage_code: raw_import, culling, editing, client_preview, revisions, final_export, quality_check, delivery, completed
tax_type: cgst_sgst, igst
audit_action: create, update, soft_delete, restore, delete, login_success, login_failure, mfa_success, mfa_failure, password_change, password_reset, role_change, lockout, unlock, gst_toggle, gmail_connect, gmail_disconnect, data_reset, setup_lock
```

---

## 3. Identity, security and system

```
profiles
  id uuid pk fk→auth.users ON DELETE RESTRICT
  email citext nn unique
  full_name text nn
  role user_role nn
  phone text
  avatar_path text
  is_active bool nn default true
  locked_until timestamptz                  -- login lockout (D-09)
  deactivated_at timestamptz
  last_seen_at timestamptz
  created_at, updated_at

invitations
  id pk, email citext nn, full_name text nn, role user_role nn CHECK (role <> 'system_admin')
  token_hash text nn unique                 -- SHA-256 of token; token never stored
  invited_by fk→profiles nn
  expires_at timestamptz nn                 -- created_at + 72h
  accepted_at, revoked_at timestamptz
  created_at
  UNIQUE partial index (email) WHERE accepted_at IS NULL AND revoked_at IS NULL

auth_attempts                               -- schema app; service role only
  id, email_ci citext nn, ip inet, succeeded bool nn, attempted_at timestamptz nn default now()
  index (email_ci, attempted_at desc)

audit_log                                   -- append-only
  id bigint generated always as identity pk
  actor_user_id uuid, actor_role user_role
  action audit_action nn
  table_name text, record_id text
  old_values jsonb, new_values jsonb        -- secrets stripped by trigger allowlist
  metadata jsonb
  ip_address inet, user_agent text          -- mandatory for auth events, best effort otherwise
  created_at timestamptz nn default now()
  indexes: (created_at desc), (table_name, record_id), (actor_user_id, created_at desc)
  triggers: BEFORE UPDATE/DELETE → raise exception

notifications
  id pk, user_id fk→profiles nn
  type text nn, title text nn, body text, link text
  is_read bool nn default false, read_at timestamptz
  created_at
  index (user_id, is_read, created_at desc)

files                                       -- registry for every stored object
  id pk, bucket text nn, storage_path text nn, original_name text, content_type text nn
  size_bytes bigint nn, entity_type text, entity_id uuid
  uploaded_by fk→profiles, created_at
  UNIQUE (bucket, storage_path)

generation_errors
  id, kind text nn ('pdf'|'email'|'other'), resource_type text, resource_id uuid
  message text nn, detail jsonb, created_at
```

---

> **Sample-data tag (D-43):** the tables `clients`, `services`, `packages`, `crew_members`, `portfolio_items`, `expenses`, `manual_income_entries` and `enquiries` carry `is_sample bool nn default false`. Children inherit through foreign keys. The sample loader sets it to true; the `sample` reset scope deletes by this tag and its dependants.

## 4. Business configuration

```
business_settings                           -- singleton
  id smallint pk default 1 CHECK (id = 1)
  studio_name text nn, tagline text, phone text, email text, website text
  address_line1, address_line2, city, state text, state_code char(2), pincode text
  gstin text, pan text
  bank_name, bank_account_holder, bank_account_number, bank_ifsc, upi_id text
  setup_mode bool nn default true              -- while true, SA may reset business data (D-43)
  setup_locked_at timestamptz                  -- set by Lock setup; never set back to null by the app
  gst_enabled bool nn default false
  default_cgst_bps int default 900, default_sgst_bps int default 900, default_igst_bps int default 1800
  logo_path text, primary_color text, secondary_color text, letterhead_layout text, email_signature text
  social_links jsonb default '{}'
  default_quote_validity_days int default 30
  default_quote_terms text, default_invoice_terms text, default_payment_terms text, receipt_note text
  updated_by fk→profiles, updated_at

document_number_config
  doc_type document_type pk
  prefix text nn, padding smallint nn default 6, year_format text nn default 'YYYY' CHECK (in ('YYYY','YY'))
  fy_start_month smallint nn default 4 CHECK (between 1 and 12)
  updated_by, updated_at

document_sequences                          -- schema app
  doc_type document_type, fy int, last_value int nn default 0
  pk (doc_type, fy)

service_category_tax                        -- GST-05
  category service_category pk, hsn_sac_code text, cgst_bps int, sgst_bps int, igst_bps int

email_templates
  code text pk ('quotation','invoice','receipt','payment_reminder','review_request','invitation','password_reset')
  subject text nn, body_html text nn, is_active bool nn default true
  updated_by, updated_at

gmail_credentials                           -- singleton, service role only
  id smallint pk default 1 CHECK (id = 1)
  google_email text nn, from_name text, reply_to text
  access_token_enc text nn, refresh_token_enc text nn, token_expires_at timestamptz nn
  scopes text[] nn, status gmail_connection_status nn
  connected_by fk→profiles, connected_at timestamptz, last_error text, updated_at

email_send_log
  id pk, document_type document_type, document_id uuid, client_id fk→clients
  recipient text nn, subject text nn, sender_email text nn
  gmail_message_id text, status email_send_status nn, error text
  idempotency_key text nn unique
  sent_by fk→profiles nn, sent_at timestamptz nn default now()

expense_categories
  id pk, code text nn unique, name text nn, is_builtin bool nn default false, is_archived bool nn default false, sort int

site_content   (key text pk, value jsonb nn, updated_by, updated_at)
site_page_seo  (page_key text pk, meta_title text, meta_description text, og_image_path text, updated_at)
faq_items      (id pk, question text nn, answer text nn, sort int nn default 0, is_published bool nn default true, created_at, updated_at)
```

---

## 5. Clients, enquiries, activity

```
clients
  id pk, full_name text nn, address_line1, address_line2, city, state text, state_code char(2), pincode text
  gstin text, referral_source enquiry_source, notes text
  search tsvector generated (full_name, city)
  created_by fk→profiles, created_at, updated_at, deleted_at
  indexes: GIN(search), GIN(full_name gin_trgm_ops)

client_phones
  id pk, client_id fk→clients ON DELETE CASCADE nn, phone_e164 text nn, label text
  is_primary bool nn default false, is_international bool nn default false
  CHECK (is_international OR phone_e164 ~ '^\+91[6-9][0-9]{9}$')
  UNIQUE (client_id, phone_e164); index (phone_e164)
  trigger: max 3 per client; exactly one primary

client_emails
  id pk, client_id fk→clients ON DELETE CASCADE nn, email citext nn, is_primary bool nn default false
  UNIQUE (client_id, email); index (email); trigger: max 2 per client

enquiries
  id pk, client_id fk→clients                -- null for guest enquiries (CLI-05)
  guest_name text, guest_phone text, guest_email citext
  CHECK (client_id IS NOT NULL OR guest_name IS NOT NULL)
  event_type event_type nn, event_date date, event_date_is_approx bool default true
  venue text, guest_count int, services_interested text[], budget_paise bigint
  source enquiry_source nn default 'other', status enquiry_status nn default 'new'
  assigned_to fk→profiles, message text, notes text, lost_reason text
  converted_booking_id fk→bookings
  consent_given_at timestamptz                -- privacy consent on public form (SECURITY_PLAN §10.2)
  created_by fk→profiles                      -- null for public submissions
  created_at, updated_at, deleted_at
  indexes: (status, created_at desc), (assigned_to), (client_id), (event_date)

follow_ups
  id pk, enquiry_id fk→enquiries nn, due_at timestamptz nn, note text
  assigned_to fk→profiles nn, status follow_up_status nn default 'open'
  completed_at, completed_by fk→profiles, created_by fk→profiles
  created_at, updated_at; index (status, due_at)

activities                                   -- unified feed (CLI-12)
  id pk, client_id fk→clients, entity_type text nn, entity_id uuid nn
  action text nn                             -- e.g. enquiry_status_changed, quotation_sent, email_sent, payment_recorded
  metadata jsonb, actor_id fk→profiles, created_at
  index (client_id, created_at desc), (entity_type, entity_id)
```

---

## 6. Catalogue

```
services
  id pk, name text nn, category service_category nn, description text, unit service_unit nn
  is_active bool nn default true, show_on_website bool nn default false, sort int default 0
  created_at, updated_at, deleted_at

service_prices                               -- SVC-03 history
  id pk, service_id fk→services nn, price_paise bigint nn, effective_from date nn, created_by fk→profiles, created_at
  UNIQUE (service_id, effective_from); index (service_id, effective_from desc)

packages
  id pk, name text nn, description text, is_active bool nn default true, show_on_website bool nn default false
  sort int default 0, created_at, updated_at, deleted_at

package_prices (id pk, package_id fk→packages nn, price_paise bigint nn, effective_from date nn, created_by, created_at, UNIQUE (package_id, effective_from))
package_items  (package_id fk→packages, service_id fk→services, quantity int nn default 1 CHECK (>0), pk (package_id, service_id))
```

---

## 7. Quotations

Totals and GST pattern (shared by quotations, invoices, credit notes):
`subtotal_paise, discount_type, discount_bps, discount_fixed_paise, discount_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, tax_paise, total_paise, gst_applied bool, tax_type, business_gstin, client_gstin, place_of_supply_state_code`.
Constraint: `(discount_type='percent' AND discount_bps IS NOT NULL AND discount_fixed_paise IS NULL) OR (discount_type='fixed' AND discount_fixed_paise IS NOT NULL AND discount_bps IS NULL) OR discount_type IS NULL`. `discount_paise <= subtotal_paise`.

```
quotations
  id pk, root_id uuid nn                      -- = id for version 1
  version_no int nn default 1, is_current bool nn default true
  quotation_number text nn                    -- shared by all versions
  client_id fk→clients nn, enquiry_id fk→enquiries
  status quotation_status nn default 'draft'
  event_date date, valid_until date nn
  [totals + GST pattern]
  notes_to_client text, internal_notes text, terms text
  pdf_path text, pdf_generated_at timestamptz
  sent_at, accepted_at, rejected_at timestamptz
  created_by fk→profiles, created_at, updated_at, deleted_at
  UNIQUE (quotation_number, version_no)
  UNIQUE partial (root_id) WHERE is_current            -- one current version
  indexes: (client_id), (status), (valid_until)
  trigger: only drafts may be soft-deleted; sent/accepted rows are immutable except status fields

quotation_items
  id pk, quotation_id fk→quotations ON DELETE CASCADE nn, sort int nn
  service_id fk→services, package_id fk→packages, service_archived_flag bool default false
  description text nn, quantity int nn CHECK (>0), unit_price_paise bigint nn
  line_total_paise bigint nn CHECK (= quantity * unit_price_paise)
  hsn_sac_code text, cgst_bps int, sgst_bps int, igst_bps int
  line_discount_paise bigint default 0, line_taxable_paise bigint, cgst_paise, sgst_paise, igst_paise bigint

quotation_templates      (id pk, name text nn, event_type event_type, is_active bool default true, created_by, created_at, updated_at)
quotation_template_items (id pk, template_id fk→quotation_templates ON DELETE CASCADE, sort int, service_id fk→services, description text nn, quantity int nn, unit_price_paise bigint nn)
```

---

## 8. Bookings, events, crew

```
bookings
  id pk, booking_number text nn unique
  client_id fk→clients nn, enquiry_id fk→enquiries, quotation_id fk→quotations   -- the version used
  status booking_status nn default 'confirmed'
  contract_total_paise bigint nn, notes text, target_delivery_date date
  cancelled_at timestamptz, cancellation_reason text, cancellation_fee_paise bigint
  CHECK (status <> 'cancelled' OR cancellation_reason IS NOT NULL)
  created_by fk→profiles, created_at, updated_at, deleted_at
  trigger: soft delete only when status = 'confirmed'

booking_line_items                           -- copy of quotation lines (BK-10)
  id pk, booking_id fk→bookings ON DELETE CASCADE nn, sort int, description text nn
  quantity int nn, unit_price_paise bigint nn, line_total_paise bigint nn

events
  id pk, booking_id fk→bookings nn, event_type event_type nn, name text nn
  event_date date nn, start_time time, end_time time CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
  venue_name text nn, venue_address text, requirements text, equipment_notes text, sort int default 0
  created_at, updated_at, deleted_at
  indexes: (event_date), (booking_id)

crew_members
  id pk, profile_id fk→profiles unique          -- optional login (CREW-02)
  full_name text nn, role crew_role nn, crew_type crew_type nn
  phone text nn, email citext, rate_paise bigint, rate_unit text CHECK (in ('per_day','per_event'))
  bank_details_enc text                         -- app-layer AES-256-GCM JSON
  portfolio_url text, notes text, is_active bool nn default true
  created_at, updated_at

event_crew_assignments
  id pk, event_id fk→events nn, crew_member_id fk→crew_members nn
  role event_assignment_role nn, rate_override_paise bigint, confirmed_at timestamptz, notes text
  override_reason text, override_by fk→profiles       -- set when a conflict was overridden (D-34)
  created_at; UNIQUE (event_id, crew_member_id)

crew_unavailability
  id pk, crew_member_id fk→crew_members nn, from_ts timestamptz nn, to_ts timestamptz nn CHECK (to_ts > from_ts)
  reason text, created_by fk→profiles, created_at

crew_pay_records
  id pk, crew_member_id fk→crew_members nn, booking_id fk→bookings nn, event_id fk→events
  work_dates date[], agreed_paise bigint nn, paid_paise bigint nn default 0 CHECK (paid_paise <= agreed_paise)
  status crew_pay_status nn default 'unpaid', notes text, created_by, created_at, updated_at

crew_pay_payments
  id pk, crew_pay_record_id fk→crew_pay_records nn, amount_paise bigint nn CHECK (> 0)
  paid_date date nn, method payment_method nn, reference_number text, notes text
  expense_id uuid unique                        -- fk→expenses, created in same transaction (D-23)
  created_by fk→profiles, created_at
```

---

## 9. Billing and finance

```
invoices
  id pk, invoice_number text nn unique
  booking_id fk→bookings nn, client_id fk→clients nn
  status invoice_status nn default 'draft'
  issue_date date nn, due_date date nn CHECK (due_date >= issue_date)
  [totals + GST pattern]
  paid_paise bigint nn default 0              -- maintained by record_payment/void functions
  credited_paise bigint nn default 0          -- maintained by credit note functions
  CHECK (paid_paise + credited_paise <= total_paise)
  notes_to_client text, internal_notes text, terms text, payment_terms text
  pdf_path text, pdf_generated_at timestamptz, sent_at timestamptz
  cancelled_at timestamptz, cancel_reason text
  created_by fk→profiles, created_at, updated_at
  indexes: (booking_id), (client_id), (status, due_date)
  triggers: (a) after status 'sent', only notes/due_date/pdf fields may change;
            (b) if paid_paise > 0, financial columns are immutable;
            (c) no DELETE allowed

invoice_items  (same columns as quotation_items, FK invoice_id fk→invoices ON DELETE RESTRICT)

credit_notes
  id pk, credit_note_number text nn unique, invoice_id fk→invoices nn, client_id fk→clients nn
  status credit_note_status nn default 'issued', issue_date date nn, reason text nn
  [totals + GST pattern]                      -- amounts are positive reductions
  pdf_path, pdf_generated_at, sent_at, created_by, created_at
  CHECK (total_paise <= invoice remaining credit)  -- enforced in issue function (V1: cannot exceed unpaid balance)
credit_note_items (id pk, credit_note_id fk, sort, description, quantity, unit_price_paise, line_total_paise, tax columns as items)

payments
  id pk, client_id fk→clients nn, payment_date date nn
  amount_paise bigint nn CHECK (> 0), method payment_method nn, reference_number text, notes text
  status payment_status nn default 'recorded'
  voided_at timestamptz, voided_by fk→profiles, void_reason text
  recorded_by fk→profiles nn, created_at
  CHECK (status <> 'voided' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL))
  triggers: no DELETE; UPDATE allowed only to set void columns

payment_allocations
  id pk, payment_id fk→payments nn, invoice_id fk→invoices nn
  amount_paise bigint nn CHECK (> 0)
  reversed_at timestamptz, reversed_by fk→profiles, reversed_reason text
  created_at
  UNIQUE partial (payment_id, invoice_id) WHERE reversed_at IS NULL
  CONSTRAINT TRIGGER (DEFERRABLE INITIALLY DEFERRED): for every recorded payment,
     Σ amount of non-reversed allocations = payments.amount_paise
  CONSTRAINT TRIGGER: for every invoice, Σ non-reversed allocations + credited_paise <= total_paise
  triggers: no DELETE; UPDATE only to set reversal columns

receipts
  id pk, receipt_number text nn unique, payment_id fk→payments nn unique
  pdf_path text, generated_at timestamptz, sent_at timestamptz, created_at

expenses
  id pk, expense_date date nn, category_id fk→expense_categories nn
  description text nn, amount_paise bigint nn CHECK (> 0), vendor text
  payment_method payment_method, reference_number text, receipt_path text
  booking_id fk→bookings, source text nn default 'manual' CHECK (in ('manual','system'))
  notes text, created_by fk→profiles, created_at, updated_at, deleted_at
  CHECK: category 'crew_payment' only when source = 'system'
  index (expense_date), (category_id)

manual_income_entries
  id pk, entry_date date nn, description text nn, amount_paise bigint nn CHECK (> 0)
  payment_method payment_method, reference_number text, notes text
  created_by fk→profiles, created_at, updated_at, deleted_at
```

---

## 10. Delivery, reviews, portfolio

```
delivery_pipelines
  id pk, booking_id fk→bookings nn unique
  target_date date, completed_at timestamptz, notes text
  share_token_hash text unique, share_expires_at timestamptz, share_revoked_at timestamptz
  created_at, updated_at

delivery_stages
  id pk, pipeline_id fk→delivery_pipelines ON DELETE CASCADE nn
  stage_code delivery_stage_code nn, sort smallint nn CHECK (between 1 and 9)
  status delivery_stage_status nn default 'pending'
  started_at, completed_at timestamptz, blocked_reason text, notes text
  CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL)
  UNIQUE (pipeline_id, stage_code); UNIQUE (pipeline_id, sort)
  trigger: sequential completion unless the actor role is SA/BO (override logged)

delivery_stage_assignees (stage_id fk→delivery_stages ON DELETE CASCADE, profile_id fk→profiles, pk (stage_id, profile_id))

delivery_stage_attachments
  id pk, stage_id fk→delivery_stages ON DELETE CASCADE nn, kind text nn CHECK (in ('link','file'))
  label text, url text, file_id fk→files, created_by, created_at
  CHECK ((kind='link' AND url IS NOT NULL) OR (kind='file' AND file_id IS NOT NULL))

review_requests
  id pk, booking_id fk→bookings nn, token_hash text nn unique
  expires_at timestamptz nn                    -- created_at + 30 days
  sent_at, submitted_at, revoked_at timestamptz
  created_by fk→profiles, created_at
  UNIQUE partial (booking_id) WHERE submitted_at IS NULL AND revoked_at IS NULL

reviews
  id pk, booking_id fk→bookings nn UNIQUE      -- one per booking (REV-10)
  client_id fk→clients nn, review_request_id fk→review_requests
  overall_rating smallint nn CHECK (between 1 and 5)
  communication_rating, quality_rating, punctuality_rating smallint CHECK (between 1 and 5)
  body text nn CHECK (char_length(body) >= 10)
  reviewer_name text nn, event_type event_type, event_date date
  status review_status nn default 'pending', moderation_note text
  moderated_by fk→profiles, moderated_at timestamptz
  submitted_at timestamptz nn default now(), created_at, updated_at

portfolio_items
  id pk, title text nn, event_type event_type nn, description text, shoot_date date
  cover_image_path text, video_url text, tags text[], sort int default 0
  is_published bool nn default false
  client_consent_confirmed_at timestamptz     -- required before publishing (see SECURITY_PLAN §10)
  CHECK (NOT is_published OR client_consent_confirmed_at IS NOT NULL)
  created_by, created_at, updated_at, deleted_at

portfolio_images (id pk, item_id fk→portfolio_items ON DELETE CASCADE nn, storage_path text nn, alt_text text nn, width int, height int, sort int default 0)
```

---

## 11. Views

| View | Purpose |
|---|---|
| `quotations_v` | Adds `display_status`: `expired` when `status='sent' AND valid_until < today(IST)`, else `status`. |
| `invoices_v` | Adds `balance_paise = total - paid - credited`, `display_status`: `overdue` when `status IN ('sent','partially_paid') AND due_date < today AND balance > 0`. |
| `services_current_v`, `packages_current_v` | Current price = latest `effective_from <= today`. |
| `ledger_entries_v` | `UNION ALL` of: non-voided `payments` (income, `source='invoice_payment'`), non-deleted `manual_income_entries` (income, `source='manual'`), non-deleted `expenses` (expense). Columns: `entry_date, type, category, amount_paise, source, reference_type, reference_id, description`. Restricted to SA, BO, AC. |
| `bookings_ops_v` | Bookings without any money columns, for ST and CR. |
| `crew_event_v` | Events with venue, time, booking number and client display name only, for CR. |
| `client_summary_v` | Totals: bookings count, revenue (paid), outstanding. |
| `review_stats_v` | Average and count of `approved` reviews. |

All views are `security_invoker = false` with explicit role filters through `app.has_role` (see RBAC §5) unless stated.

---

## 12. Functions (the only way to perform multi-row financial writes)

| Function | Behaviour |
|---|---|
| `app.next_document_number(doc_type)` | Atomic `INSERT … ON CONFLICT (doc_type, fy) DO UPDATE SET last_value = last_value + 1 RETURNING`. Computes FY from IST date and `fy_start_month`. Formats with prefix, year format, padding (D-19). |
| `create_quotation(payload jsonb)` / `create_quotation_version(root_id, payload)` | Allocates number or reuses `quotation_number`, marks previous version `superseded`, `is_current=false`, inserts items. |
| `convert_enquiry_to_booking(enquiry_id, quotation_id, payload)` | Creates booking (number), copies lines, creates events, creates delivery pipeline with 9 stages, sets enquiry `converted`, writes activity. One transaction. |
| `create_invoice(payload)` | Allocates number, inserts invoice and items, verifies sums. |
| `record_payment(payload)` | Locks target invoices `FOR UPDATE`, checks balance, inserts payment, allocations and receipt number, updates `paid_paise`, sets invoice status (`partially_paid`/`paid`), writes activity and audit context. Rejects over-allocation. |
| `void_payment(payment_id, reason)` | Marks payment voided, reverses allocations, recomputes invoices, writes audit. |
| `reallocate_payment(payment_id, allocations jsonb, reason)` | Reverses active allocations and creates new ones in one transaction (used with credit notes). |
| `issue_credit_note(payload)` | Allocates `CN` number, validates amount against unpaid balance, updates `credited_paise`. |
| `cancel_invoice(invoice_id, reason)` | Allowed only when `paid_paise = 0`. |
| `cancel_booking(booking_id, reason, fee)` | Sets status and fee. Does **not** touch invoices (D-35). |
| `record_crew_payment(payload)` | Inserts crew payment and the linked `expenses` row (`category crew_payment`, `source system`), updates pay record. |
| `assign_crew(event_id, crew_id, role, override jsonb)` | Server-side conflict check against overlapping assignments and unavailability. Requires `override.reason` to proceed on conflict. |
| `generate_review_request(booking_id)` / `submit_review(token, payload)` | Token hashing, expiry and one-per-booking enforcement. |
| `app.audit_trigger()` | Generic row trigger writing `audit_log` with column allowlist per table. |
| `app.touch_updated_at()` | Sets `updated_at`. |
| `app.reset_business_data(scopes text[], restart_numbering bool, clear_audit bool)` | Service-role only. Raises unless (`setup_mode` is true or `APP_MODE` is demo). Sets a transaction-local flag `app.reset_in_progress = 'on'` that the `block_mutation` triggers honour, deletes in dependency order per scope, optionally resets `document_sequences`, returns row counts and the list of storage paths to remove. Writes the `data_reset` audit entry. |
| `app.lock_setup()` | Service-role only. Sets `setup_mode=false`, `setup_locked_at=now()`, writes `setup_lock` audit entry. No unlock function exists. |
| `app.load_sample_data()` | Service-role only, setup mode or demo only. Inserts the synthetic dataset with `is_sample = true` on top-level rows (clients, services, packages, crew_members, portfolio_items, expenses, manual income) and linked children by foreign key, so the `sample` scope can remove exactly that set. |
| `app.role()`, `app.has_role()`, … | See RBAC §7. |

---

## 13. Indexes (beyond those listed)

Foreign keys all indexed. Additional: `clients` GIN trigram on `full_name`; `client_phones(phone_e164)`; `enquiries(status, created_at desc)`; `follow_ups(status, due_at)`; `quotations(client_id, created_at desc)`; `invoices(status, due_date)`; `payments(payment_date)`; `payment_allocations(invoice_id)`; `expenses(expense_date)`; `events(event_date)`; `audit_log(created_at desc)`; `activities(client_id, created_at desc)`; `notifications(user_id, is_read, created_at desc)`.

---

## 14. Triggers summary

| Trigger | Tables | Effect |
|---|---|---|
| `touch_updated_at` | all mutable | maintains `updated_at` |
| `audit_trigger` | clients, enquiries, quotations, bookings, events, invoices, credit_notes, payments, payment_allocations, expenses, manual_income_entries, crew_members, crew_pay_records, services, packages, delivery_stages, reviews, business_settings, document_number_config, email_templates, profiles, portfolio_items | audit rows (secrets and tokens excluded) |
| `block_mutation` | audit_log (UPDATE/DELETE), payments (DELETE), payment_allocations (DELETE), receipts (UPDATE/DELETE), invoices (DELETE) | raise exception |
| `profile_role_guard` | profiles | blocks role escalation (RBAC §7.3) |
| `last_owner_guard` | profiles | blocks deactivating or demoting the last active BO or SA |
| `sum_checks` | quotations/invoices/credit_notes and items | deferred sum verification |
| `allocation_guard` | payment_allocations | deferred constraint triggers (§9) |
| `max_contacts` | client_phones, client_emails | enforce 3 phones, 2 emails, one primary |
| `stage_sequence` | delivery_stages | sequential completion rule |

---

## 15. Seed data (migration-time)

1. `document_number_config`: QT, INV, RCP, BK, CN with defaults.
2. `expense_categories`: equipment, travel, crew_payment, marketing, software, rent, utilities, miscellaneous (all `is_builtin`).
3. `email_templates`: default subject and body for all seven codes.
4. `business_settings`: singleton row with placeholder studio name.
5. `service_category_tax`: seven rows, nulls until GST is configured.
6. First `system_admin`: created by a one-time script (not a migration) using the admin API, then MFA enrolment at first login (D-02). Script refuses to run if a `system_admin` already exists.

---

## 16. Retention hooks

No automatic deletion in V1. Financial tables (`invoices`, `invoice_items`, `payments`, `payment_allocations`, `receipts`, `credit_notes`, `expenses`, `manual_income_entries`) are retained at least 8 years; client data at least 7 years (RETENTION-01/02). Erasure requests use an `anonymise_client(client_id)` function that nulls personal fields and keeps financial rows (SECURITY_PLAN §10).

---

## 17. Migration file order

`001_extensions_enums` → `002_helpers_app_schema` → `003_identity_audit` → `004_settings_numbering` → `005_clients_enquiries` → `006_catalogue` → `007_quotations` → `008_bookings_crew` → `009_billing_payments` → `010_ledger_views` → `011_delivery` → `012_reviews_portfolio` → `013_site_content` → `014_rls_policies` (generated from RBAC matrix) → `015_functions` → `016_triggers` → `017_seed`. Each migration is immutable once applied; changes use new migrations (Integration §1.2).
