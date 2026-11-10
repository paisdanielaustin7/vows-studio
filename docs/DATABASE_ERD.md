# VOWS Studio — Database ERD

> **Status:** Draft for review · **Date:** 2026-11-10 · **Source of truth:** `DATABASE_SCHEMA.md`. If a diagram and the schema disagree, the schema wins and this file is corrected.
> Diagrams use Mermaid `erDiagram`. Only keys and the most important columns are shown. Cardinality notation: `||` exactly one, `o|` zero or one, `|{` one or more, `o{` zero or more.

---

## 1. Overview (domain map)

```mermaid
flowchart LR
    ID[Identity & Security]
    CFG[Configuration]
    CRM[Clients & Enquiries]
    CAT[Catalogue]
    Q[Quotations]
    B[Bookings, Events, Crew]
    FIN[Invoices, Payments, Ledger]
    DEL[Delivery]
    REV[Reviews & Portfolio]

    CRM --> Q
    CAT --> Q
    Q --> B
    CRM --> B
    B --> FIN
    B --> DEL
    DEL --> REV
    B --> REV
    CFG -.-> Q
    CFG -.-> FIN
    ID -.-> CRM
    ID -.-> FIN
    ID -.-> B
```

Solid arrows are data dependencies (foreign keys). Dotted arrows are configuration or audit/identity references.

---

## 2. Identity, security and configuration

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "id"
    PROFILES ||--o{ INVITATIONS : "invited_by"
    PROFILES ||--o{ NOTIFICATIONS : "user_id"
    PROFILES ||--o{ AUDIT_LOG : "actor_user_id (soft ref)"
    PROFILES ||--o{ FILES : "uploaded_by"
    PROFILES o|--o| CREW_MEMBERS : "profile_id"
    BUSINESS_SETTINGS ||--o{ DOCUMENT_NUMBER_CONFIG : "configures (logical)"
    DOCUMENT_NUMBER_CONFIG ||--o{ DOCUMENT_SEQUENCES : "per FY (logical)"
    PROFILES ||--o| GMAIL_CREDENTIALS : "connected_by"
    GMAIL_CREDENTIALS ||--o{ EMAIL_SEND_LOG : "sender (logical)"

    PROFILES {
      uuid id PK
      citext email
      user_role role
      bool is_active
    }
    INVITATIONS {
      uuid id PK
      citext email
      text token_hash
      timestamptz expires_at
    }
    AUDIT_LOG {
      bigint id PK
      uuid actor_user_id
      audit_action action
      text table_name
      jsonb old_values
      jsonb new_values
    }
    BUSINESS_SETTINGS {
      smallint id PK "always 1"
      text studio_name
      bool gst_enabled
    }
    DOCUMENT_SEQUENCES {
      document_type doc_type PK
      int fy PK
      int last_value
    }
    GMAIL_CREDENTIALS {
      smallint id PK "always 1"
      text google_email
      gmail_connection_status status
    }
```

Standalone tables (no FK): `email_templates`, `expense_categories`, `site_content`, `site_page_seo`, `faq_items`, `service_category_tax`, `generation_errors`, `auth_attempts`.

---

## 3. Clients, enquiries, catalogue and quotations

```mermaid
erDiagram
    CLIENTS ||--o{ CLIENT_PHONES : has
    CLIENTS ||--o{ CLIENT_EMAILS : has
    CLIENTS ||--o{ ENQUIRIES : "client_id (optional)"
    ENQUIRIES ||--o{ FOLLOW_UPS : has
    CLIENTS ||--o{ ACTIVITIES : "feed"
    CLIENTS ||--o{ QUOTATIONS : receives
    ENQUIRIES o|--o{ QUOTATIONS : "enquiry_id"
    QUOTATIONS ||--|{ QUOTATION_ITEMS : contains
    QUOTATIONS ||--o{ QUOTATIONS : "root_id (versions)"
    SERVICES ||--o{ SERVICE_PRICES : "price history"
    SERVICES ||--o{ QUOTATION_ITEMS : "source (optional)"
    PACKAGES ||--o{ PACKAGE_PRICES : "price history"
    PACKAGES ||--|{ PACKAGE_ITEMS : includes
    SERVICES ||--o{ PACKAGE_ITEMS : "included in"
    PACKAGES ||--o{ QUOTATION_ITEMS : "source (optional)"
    QUOTATION_TEMPLATES ||--|{ QUOTATION_TEMPLATE_ITEMS : contains
    SERVICES ||--o{ QUOTATION_TEMPLATE_ITEMS : "source (optional)"

    CLIENTS {
      uuid id PK
      text full_name
      text gstin
      timestamptz deleted_at
    }
    ENQUIRIES {
      uuid id PK
      uuid client_id FK "nullable"
      text guest_name
      enquiry_status status
      uuid converted_booking_id FK
    }
    QUOTATIONS {
      uuid id PK
      uuid root_id
      int version_no
      bool is_current
      text quotation_number
      quotation_status status
      bigint total_paise
    }
    QUOTATION_ITEMS {
      uuid id PK
      uuid quotation_id FK
      int quantity
      bigint unit_price_paise
      bigint line_total_paise
    }
    SERVICES {
      uuid id PK
      service_category category
      bool is_active
    }
    SERVICE_PRICES {
      uuid id PK
      date effective_from
      bigint price_paise
    }
```

---

## 4. Bookings, events and crew

```mermaid
erDiagram
    CLIENTS ||--o{ BOOKINGS : books
    ENQUIRIES o|--o| BOOKINGS : "converted from"
    QUOTATIONS o|--o{ BOOKINGS : "version used"
    BOOKINGS ||--o{ BOOKING_LINE_ITEMS : "copied lines"
    BOOKINGS ||--|{ EVENTS : contains
    EVENTS ||--o{ EVENT_CREW_ASSIGNMENTS : staffed
    CREW_MEMBERS ||--o{ EVENT_CREW_ASSIGNMENTS : assigned
    CREW_MEMBERS ||--o{ CREW_UNAVAILABILITY : blocks
    CREW_MEMBERS ||--o{ CREW_PAY_RECORDS : earns
    BOOKINGS ||--o{ CREW_PAY_RECORDS : "for"
    EVENTS o|--o{ CREW_PAY_RECORDS : "optional"
    CREW_PAY_RECORDS ||--o{ CREW_PAY_PAYMENTS : "paid by"
    CREW_PAY_PAYMENTS o|--o| EXPENSES : "creates (system)"

    BOOKINGS {
      uuid id PK
      text booking_number
      booking_status status
      bigint contract_total_paise
      text cancellation_reason
    }
    EVENTS {
      uuid id PK
      uuid booking_id FK
      event_type event_type
      date event_date
      text venue_name
    }
    CREW_MEMBERS {
      uuid id PK
      uuid profile_id FK "nullable"
      crew_role role
      bool is_active
    }
    EVENT_CREW_ASSIGNMENTS {
      uuid id PK
      event_assignment_role role
      text override_reason
    }
```

---

## 5. Billing, payments and ledger

```mermaid
erDiagram
    BOOKINGS ||--o{ INVOICES : billed
    CLIENTS ||--o{ INVOICES : owes
    INVOICES ||--|{ INVOICE_ITEMS : contains
    INVOICES ||--o{ CREDIT_NOTES : "corrected by"
    CREDIT_NOTES ||--|{ CREDIT_NOTE_ITEMS : contains
    CLIENTS ||--o{ PAYMENTS : pays
    PAYMENTS ||--|{ PAYMENT_ALLOCATIONS : "split into"
    INVOICES ||--o{ PAYMENT_ALLOCATIONS : receives
    PAYMENTS ||--|| RECEIPTS : "one receipt"
    EXPENSE_CATEGORIES ||--o{ EXPENSES : classifies
    BOOKINGS o|--o{ EXPENSES : "optional link"

    INVOICES {
      uuid id PK
      text invoice_number
      invoice_status status
      bigint total_paise
      bigint paid_paise
      bigint credited_paise
      date due_date
    }
    PAYMENTS {
      uuid id PK
      bigint amount_paise
      payment_method method
      payment_status status
    }
    PAYMENT_ALLOCATIONS {
      uuid id PK
      bigint amount_paise
      timestamptz reversed_at
    }
    EXPENSES {
      uuid id PK
      bigint amount_paise
      text source "manual|system"
    }
    MANUAL_INCOME_ENTRIES {
      uuid id PK
      bigint amount_paise
    }
```

**Ledger (view, not a table):** `ledger_entries_v` = non-voided `PAYMENTS` (income) ∪ `MANUAL_INCOME_ENTRIES` (income) ∪ non-deleted `EXPENSES` (expense). No foreign keys because it is derived.

---

## 6. Delivery, reviews and portfolio

```mermaid
erDiagram
    BOOKINGS ||--|| DELIVERY_PIPELINES : "exactly one"
    DELIVERY_PIPELINES ||--|{ DELIVERY_STAGES : "9 stages"
    DELIVERY_STAGES ||--o{ DELIVERY_STAGE_ASSIGNEES : "assigned"
    PROFILES ||--o{ DELIVERY_STAGE_ASSIGNEES : works
    DELIVERY_STAGES ||--o{ DELIVERY_STAGE_ATTACHMENTS : "links/files"
    FILES o|--o{ DELIVERY_STAGE_ATTACHMENTS : "file kind"
    BOOKINGS ||--o{ REVIEW_REQUESTS : "link history"
    BOOKINGS ||--o| REVIEWS : "one per booking"
    REVIEW_REQUESTS o|--o| REVIEWS : "submitted via"
    CLIENTS ||--o{ REVIEWS : writes
    PORTFOLIO_ITEMS ||--|{ PORTFOLIO_IMAGES : contains

    DELIVERY_STAGES {
      uuid id PK
      delivery_stage_code stage_code
      smallint sort
      delivery_stage_status status
    }
    REVIEWS {
      uuid id PK
      smallint overall_rating
      review_status status
    }
    PORTFOLIO_ITEMS {
      uuid id PK
      bool is_published
      timestamptz client_consent_confirmed_at
    }
```

---

## 7. Relationship rules (cardinality and delete behaviour)

| Relationship | Rule |
|---|---|
| client → enquiries | Optional. Guest enquiries have no client. Client delete is soft. |
| quotation versions | All versions share `root_id` and `quotation_number`. Exactly one row per root has `is_current = true`. |
| enquiry → booking | At most one booking per enquiry (`converted_booking_id`). |
| booking → events | One or more. Booking cannot be created without at least one event. |
| booking → delivery pipeline | Exactly one, created with the booking, with 9 stages. |
| booking → invoices | Zero or many (advance and final invoices). |
| payment → allocations | One or many. Active allocations must sum to the payment amount (deferred constraint). |
| payment → receipt | Exactly one, created with the payment. |
| invoice → credit notes | Zero or many. Credited amount plus paid amount cannot exceed total. |
| crew pay payment → expense | One system expense per crew payment, created in the same transaction. |
| booking → review | At most one review per booking. Many review request links allowed over time. |
| Financial tables | `ON DELETE RESTRICT` throughout. No row in a financial table is ever deleted. |
| Child item tables | `ON DELETE CASCADE` only for quotation, booking, template, portfolio and delivery children, because their parents are soft-deleted and never physically removed in normal operation. |

---

## 8. Table count and ownership by migration

| Domain | Tables |
|---|---|
| Identity & security (7) | `profiles`, `invitations`, `auth_attempts`, `audit_log`, `notifications`, `files`, `generation_errors` |
| Configuration (11) | `business_settings`, `document_number_config`, `document_sequences`, `service_category_tax`, `email_templates`, `gmail_credentials`, `email_send_log`, `expense_categories`, `site_content`, `site_page_seo`, `faq_items` |
| CRM (6) | `clients`, `client_phones`, `client_emails`, `enquiries`, `follow_ups`, `activities` |
| Catalogue (5) | `services`, `service_prices`, `packages`, `package_prices`, `package_items` |
| Quotations (4) | `quotations`, `quotation_items`, `quotation_templates`, `quotation_template_items` |
| Bookings & crew (8) | `bookings`, `booking_line_items`, `events`, `crew_members`, `event_crew_assignments`, `crew_unavailability`, `crew_pay_records`, `crew_pay_payments` |
| Billing & finance (9) | `invoices`, `invoice_items`, `credit_notes`, `credit_note_items`, `payments`, `payment_allocations`, `receipts`, `expenses`, `manual_income_entries` |
| Delivery (5) | `delivery_pipelines`, `delivery_stages`, `delivery_stage_assignees`, `delivery_stage_attachments`, `review_requests` |
| Reviews & portfolio (3) | `reviews`, `portfolio_items`, `portfolio_images` |

Total: 58 tables, plus 9 views (listed in `DATABASE_SCHEMA.md` §11).
