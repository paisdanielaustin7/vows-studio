# VOWS Studio — API Contracts

> **Version:** 1.0.0 | **Last Updated:** November 2026 | **Base URL:** `https://vows.studio/api`

---

## Table of Contents

- [Conventions](#conventions)
  - [Standard Error Format](#standard-error-format)
  - [Standard Success Format](#standard-success-format)
  - [Pagination](#pagination)
  - [Filtering & Sorting](#filtering--sorting)
  - [Rate Limiting](#rate-limiting)
  - [API Versioning](#api-versioning)
  - [Authentication Levels](#authentication-levels)
- [1. Auth](#1-auth)
- [2. Users](#2-users)
- [3. Clients](#3-clients)
- [4. Enquiries](#4-enquiries)
- [5. Quotations](#5-quotations)
- [6. Bookings & Events](#6-bookings--events)
- [7. Invoices](#7-invoices)
- [8. Payments](#8-payments)
- [9. Ledger / Financial Reports](#9-ledger--financial-reports)
- [10. Expenses](#10-expenses)
- [11. Crew](#11-crew)
- [12. Services & Packages](#12-services--packages)
- [13. Delivery Pipeline](#13-delivery-pipeline)
- [14. Reviews / Feedback](#14-reviews--feedback)
- [15. Settings](#15-settings)
- [16. File Uploads](#16-file-uploads)
- [17. Public Website Data](#17-public-website-data)

---

## Conventions

### Standard Error Format

All error responses follow this shape:

```typescript
{
  error: {
    code: string;          // Machine-readable code e.g. "UNAUTHORIZED", "VALIDATION_ERROR"
    message: string;       // Human-readable description
    details?: unknown;     // Optional: Zod validation errors, field-level issues
    requestId: string;     // For support/debugging correlation
  };
  data: null;
}
```

**Common error codes:**

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Zod schema validation failed |
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Valid session but insufficient role/permission |
| 404 | `NOT_FOUND` | Resource does not exist or not accessible to user |
| 409 | `CONFLICT` | Duplicate record or state conflict |
| 422 | `UNPROCESSABLE` | Business rule violation (e.g. invoice on cancelled booking) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Standard Success Format

```typescript
{
  data: T;               // Resource or array of resources
  error: null;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### Pagination

All list endpoints support cursor-based pagination via query parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `pageSize` | number | 20 | Records per page (max: 100) |
| `cursor` | string | — | Cursor for keyset pagination (preferred for large datasets) |

Example: `GET /api/clients?page=2&pageSize=25`

### Filtering & Sorting

| Param | Format | Example |
|-------|--------|---------|
| `sort` | `field:asc` or `field:desc` | `sort=created_at:desc` |
| `filter[field]` | value or range | `filter[status]=active` |
| `search` | string | `search=Rahul` (full-text search on name/email/phone) |
| `from` | ISO date | `from=2024-01-01` |
| `to` | ISO date | `to=2024-12-31` |

### Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Public endpoints (no auth) | 60 req | per minute per IP |
| Authenticated CRM endpoints | 300 req | per minute per user |
| PDF generation | 10 req | per minute per user |
| Email send | 20 req | per hour per user |

Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 275
X-RateLimit-Reset: 1699530000
```

### API Versioning

The current API is at **v1** (implicit, no prefix required). When breaking changes are introduced, a versioned prefix (`/api/v2/...`) will be introduced with a 6-month deprecation window for v1. The `API-Version` response header indicates the version serving the request.

### Authentication Levels

| Level | Description |
|-------|-------------|
| `public` | No authentication required |
| `authenticated` | Valid Supabase session (any role) |
| `viewer+` | `viewer`, `editor`, `manager`, or `system_admin` |
| `editor+` | `editor`, `manager`, or `system_admin` |
| `manager+` | `manager` or `system_admin` |
| `system_admin` | System Admin only (MFA verified) |

> [!IMPORTANT]
> Authentication is enforced server-side. All API routes read the session from the **httpOnly cookie** (`sb-auth-token`). The `Authorization` header is only accepted for Supabase Edge Function calls, not standard API routes.

---

## 1. Auth

**Base path:** `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | public | Email + password sign-in |
| POST | `/api/auth/logout` | authenticated | Sign out, clear cookies |
| GET | `/api/auth/callback` | public | OAuth/magic-link callback handler |
| POST | `/api/auth/forgot-password` | public | Send password reset email |
| POST | `/api/auth/reset-password` | public | Confirm new password with token |
| POST | `/api/auth/mfa/verify` | authenticated | Verify TOTP code (admin MFA) |
| POST | `/api/auth/invite` | system_admin | Send staff invitation email |
| POST | `/api/auth/invite/accept` | public | Accept invitation + set password |

**Request Body (POST `/api/auth/login`):**
```typescript
{
  email: string;    // valid email format
  password: string; // min 8 characters
}
```

**Response (POST `/api/auth/login`):**
```typescript
{
  data: {
    user: {
      id: string;
      email: string;
      role: "system_admin" | "manager" | "editor" | "viewer";
      mfaRequired: boolean;
    };
  };
  error: null;
}
```

**Request Body (POST `/api/auth/invite`):**
```typescript
{
  email: string;
  role: "manager" | "editor" | "viewer";
  name: string;
}
```

**Error Codes (Auth-specific):**
- `INVALID_CREDENTIALS` — wrong email or password
- `USER_DISABLED` — account deactivated
- `MFA_REQUIRED` — AAL1 session attempting admin access
- `INVALID_MFA_CODE` — TOTP code mismatch or expired
- `INVITATION_EXPIRED` — invite link older than 7 days

---

## 2. Users

**Base path:** `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | system_admin | List all users |
| GET | `/api/users/me` | authenticated | Current user profile |
| GET | `/api/users/[id]` | system_admin | Get single user |
| POST | `/api/users` | system_admin | Create user (bypasses invite flow) |
| PATCH | `/api/users/[id]` | system_admin | Update user role or status |
| DELETE | `/api/users/[id]` | system_admin | Deactivate user account |
| PATCH | `/api/users/me` | authenticated | Update own display name, avatar |

**Request Body (PATCH `/api/users/[id]`):**
```typescript
{
  role?: "manager" | "editor" | "viewer";
  isActive?: boolean;
  name?: string;
}
```

**Response (GET `/api/users`):**
```typescript
{
  data: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string; // ISO 8601
    lastSignInAt: string | null;
  }>;
  error: null;
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
```

---

## 3. Clients

**Base path:** `/api/clients`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clients` | viewer+ | List clients (paginated, filterable) |
| GET | `/api/clients/[id]` | viewer+ | Get single client + summary |
| POST | `/api/clients` | editor+ | Create client |
| PATCH | `/api/clients/[id]` | editor+ | Update client |
| DELETE | `/api/clients/[id]` | manager+ | Soft-delete client |
| GET | `/api/clients/[id]/bookings` | viewer+ | Bookings for this client |
| GET | `/api/clients/[id]/invoices` | viewer+ | Invoices for this client |

**Request Body (POST `/api/clients`):**
```typescript
{
  name: string;           // required, min 2 chars
  phone: string;          // required, Indian mobile (10 digits)
  email?: string;         // optional, valid email
  address?: string;
  city?: string;
  notes?: string;
  referralSource?: string; // "instagram" | "google" | "referral" | "walk_in" | "other"
}
```

**Response (GET `/api/clients/[id]`):**
```typescript
{
  data: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    city: string | null;
    notes: string | null;
    referralSource: string | null;
    totalBookings: number;
    totalRevenue: number;    // in paise (INR × 100)
    outstandingAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  error: null;
}
```

---

## 4. Enquiries

**Base path:** `/api/enquiries`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/enquiries` | viewer+ | List enquiries |
| GET | `/api/enquiries/[id]` | viewer+ | Single enquiry detail |
| POST | `/api/enquiries` | public | Submit enquiry (public form) |
| POST | `/api/enquiries` | editor+ | Create internal enquiry |
| PATCH | `/api/enquiries/[id]` | editor+ | Update status, assign owner |
| DELETE | `/api/enquiries/[id]` | manager+ | Delete enquiry |
| POST | `/api/enquiries/[id]/convert` | editor+ | Convert enquiry to booking |

**Request Body (POST `/api/enquiries` — public form):**
```typescript
{
  clientName: string;      // required
  clientPhone: string;     // required
  clientEmail?: string;
  eventType: string;       // "wedding" | "pre_wedding" | "birthday" | "corporate" | "other"
  eventDate?: string;      // ISO date
  eventLocation?: string;
  servicesInterested: string[];
  budget?: number;         // in paise
  message?: string;
  // honeypot field checked server-side for spam prevention
}
```

**Response (GET `/api/enquiries`):**
```typescript
{
  data: Array<{
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    eventType: string;
    eventDate: string | null;
    status: "new" | "contacted" | "quoted" | "converted" | "lost";
    assignedTo: string | null;  // user_id
    createdAt: string;
  }>;
  error: null;
  meta: PaginationMeta;
}
```

---

## 5. Quotations

**Base path:** `/api/quotations`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/quotations` | viewer+ | List quotations |
| GET | `/api/quotations/[id]` | viewer+ | Single quotation with line items |
| POST | `/api/quotations` | editor+ | Create quotation |
| PATCH | `/api/quotations/[id]` | editor+ | Update quotation (creates new version) |
| DELETE | `/api/quotations/[id]` | manager+ | Delete quotation |
| GET | `/api/quotations/[id]/versions` | viewer+ | List version history |
| POST | `/api/quotations/[id]/pdf` | editor+ | Generate and store PDF |
| POST | `/api/quotations/[id]/send` | editor+ | Send via Gmail |
| POST | `/api/quotations/[id]/approve` | manager+ | Mark as approved |

**Request Body (POST `/api/quotations`):**
```typescript
{
  clientId: string;
  enquiryId?: string;
  validUntil: string;       // ISO date
  currency: "INR";
  taxRate?: number;         // percentage, e.g. 18 for 18% GST
  discount?: number;        // in paise, applied to subtotal
  notes?: string;
  terms?: string;
  lineItems: Array<{
    serviceId?: string;     // optional reference
    description: string;    // required
    quantity: number;
    unitPrice: number;      // in paise
    taxable: boolean;
  }>;
}
```

**Response (GET `/api/quotations/[id]`):**
```typescript
{
  data: {
    id: string;
    version: number;
    status: "draft" | "sent" | "approved" | "rejected" | "expired";
    client: { id: string; name: string; phone: string; email: string | null };
    lineItems: LineItem[];
    subtotal: number;        // in paise
    discountAmount: number;
    taxAmount: number;
    total: number;
    pdfUrl?: string;         // signed URL if PDF generated
    sentAt?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  error: null;
}
```

**Response (POST `/api/quotations/[id]/pdf`):**
```typescript
{
  data: {
    pdfUrl: string;          // Signed Supabase Storage URL (1 hour TTL)
    expiresAt: string;       // ISO 8601
  };
  error: null;
}
```

---

## 6. Bookings & Events

**Base path:** `/api/bookings`, `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/bookings` | viewer+ | List bookings |
| GET | `/api/bookings/[id]` | viewer+ | Booking detail + events |
| POST | `/api/bookings` | editor+ | Create booking |
| PATCH | `/api/bookings/[id]` | editor+ | Update booking |
| DELETE | `/api/bookings/[id]` | manager+ | Cancel booking |
| GET | `/api/bookings/[id]/events` | viewer+ | Events in a booking |
| POST | `/api/bookings/[id]/events` | editor+ | Add event to booking |
| PATCH | `/api/events/[id]` | editor+ | Update event |
| DELETE | `/api/events/[id]` | editor+ | Remove event from booking |

**Request Body (POST `/api/bookings`):**
```typescript
{
  clientId: string;
  quotationId?: string;
  packageId?: string;
  status: "confirmed" | "tentative";
  totalAmount: number;       // in paise
  events: Array<{
    type: string;            // "wedding" | "reception" | "mehendi" | "engagement" | "pre_wedding" | "other"
    name: string;
    date: string;            // ISO date
    startTime?: string;      // HH:MM
    endTime?: string;
    venue: string;
    venueAddress?: string;
    crewIds?: string[];      // assigned crew members
    notes?: string;
  }>;
}
```

**Response (GET `/api/bookings`):**
```typescript
{
  data: Array<{
    id: string;
    client: { id: string; name: string; phone: string };
    status: "tentative" | "confirmed" | "completed" | "cancelled";
    upcomingEventDate: string | null;
    eventCount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    createdAt: string;
  }>;
  error: null;
  meta: PaginationMeta;
}
```

---

## 7. Invoices

**Base path:** `/api/invoices`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/invoices` | viewer+ | List invoices |
| GET | `/api/invoices/[id]` | viewer+ | Invoice detail |
| POST | `/api/invoices` | editor+ | Create invoice from booking |
| PATCH | `/api/invoices/[id]` | editor+ | Update invoice |
| DELETE | `/api/invoices/[id]` | manager+ | Void invoice |
| POST | `/api/invoices/[id]/pdf` | editor+ | Generate invoice PDF |
| POST | `/api/invoices/[id]/send` | editor+ | Send invoice via Gmail |

**Request Body (POST `/api/invoices`):**
```typescript
{
  bookingId: string;
  invoiceNumber?: string;    // auto-generated if omitted
  issueDate: string;         // ISO date
  dueDate: string;
  lineItems: LineItem[];
  discount?: number;         // in paise
  taxRate?: number;
  notes?: string;
  paymentTerms?: string;
}
```

**Response (GET `/api/invoices/[id]`):**
```typescript
{
  data: {
    id: string;
    invoiceNumber: string;
    status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";
    client: ClientSummary;
    booking: { id: string; eventSummary: string };
    lineItems: LineItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    issueDate: string;
    dueDate: string;
    pdfUrl?: string;
  };
  error: null;
}
```

---

## 8. Payments

**Base path:** `/api/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/payments` | viewer+ | List all payments |
| GET | `/api/payments/[id]` | viewer+ | Payment detail |
| POST | `/api/payments` | editor+ | Record payment |
| PATCH | `/api/payments/[id]` | manager+ | Edit payment record |
| DELETE | `/api/payments/[id]` | manager+ | Delete payment record |

**Request Body (POST `/api/payments`):**
```typescript
{
  invoiceId: string;
  amount: number;             // in paise, must be > 0
  paymentDate: string;        // ISO date
  method: "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";
  referenceNumber?: string;   // UPI txn ID, cheque number, etc.
  notes?: string;
}
```

**Response (GET `/api/payments`):**
```typescript
{
  data: Array<{
    id: string;
    invoice: { id: string; invoiceNumber: string };
    client: ClientSummary;
    amount: number;
    method: string;
    referenceNumber: string | null;
    paymentDate: string;
    recordedBy: string;        // user display name
    createdAt: string;
  }>;
  error: null;
  meta: PaginationMeta;
}
```

---

## 9. Ledger / Financial Reports

**Base path:** `/api/ledger`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ledger` | manager+ | Full ledger (income + expenses) |
| GET | `/api/ledger/summary` | manager+ | Aggregated summary (monthly/yearly) |
| GET | `/api/ledger/revenue` | manager+ | Revenue breakdown by period |
| GET | `/api/ledger/outstanding` | manager+ | Outstanding invoices report |
| GET | `/api/ledger/export` | manager+ | Export ledger as CSV |

**Query Parameters (GET `/api/ledger`):**
```
from=2024-01-01
to=2024-12-31
groupBy=month|week|day
type=income|expense|all
```

**Response (GET `/api/ledger/summary`):**
```typescript
{
  data: {
    period: { from: string; to: string };
    totalIncome: number;         // in paise
    totalExpenses: number;
    netProfit: number;
    outstandingReceivables: number;
    paidThisPeriod: number;
    monthlyBreakdown: Array<{
      month: string;             // "2024-01"
      income: number;
      expenses: number;
      net: number;
    }>;
  };
  error: null;
}
```

---

## 10. Expenses

**Base path:** `/api/expenses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/expenses` | viewer+ | List expenses |
| GET | `/api/expenses/[id]` | viewer+ | Expense detail |
| POST | `/api/expenses` | editor+ | Record expense |
| PATCH | `/api/expenses/[id]` | editor+ | Update expense |
| DELETE | `/api/expenses/[id]` | manager+ | Delete expense |

**Request Body (POST `/api/expenses`):**
```typescript
{
  category: "equipment" | "travel" | "food" | "crew_payment" | "software" | "marketing" | "other";
  description: string;
  amount: number;             // in paise
  expenseDate: string;        // ISO date
  bookingId?: string;         // if associated with a booking
  receiptUrl?: string;        // Supabase Storage path
  vendor?: string;
  notes?: string;
}
```

---

## 11. Crew

**Base path:** `/api/crew`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/crew` | viewer+ | List crew members |
| GET | `/api/crew/[id]` | viewer+ | Crew member detail |
| POST | `/api/crew` | manager+ | Add crew member |
| PATCH | `/api/crew/[id]` | manager+ | Update crew member |
| DELETE | `/api/crew/[id]` | manager+ | Deactivate crew member |
| GET | `/api/crew/[id]/availability` | viewer+ | Availability for date range |
| GET | `/api/crew/[id]/assignments` | viewer+ | Bookings/events assigned to crew |

**Request Body (POST `/api/crew`):**
```typescript
{
  name: string;
  phone: string;
  email?: string;
  role: "photographer" | "videographer" | "editor" | "assistant" | "drone_operator" | "other";
  ratePerDay?: number;        // in paise
  skills?: string[];
  notes?: string;
}
```

---

## 12. Services & Packages

**Base path:** `/api/services`, `/api/packages`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/services` | public | List services (for public site & CRM) |
| GET | `/api/services/[id]` | public | Service detail |
| POST | `/api/services` | manager+ | Create service |
| PATCH | `/api/services/[id]` | manager+ | Update service |
| DELETE | `/api/services/[id]` | manager+ | Delete service |
| GET | `/api/packages` | public | List packages |
| GET | `/api/packages/[id]` | public | Package detail with included services |
| POST | `/api/packages` | manager+ | Create package |
| PATCH | `/api/packages/[id]` | manager+ | Update package |
| DELETE | `/api/packages/[id]` | manager+ | Delete package |

**Request Body (POST `/api/services`):**
```typescript
{
  name: string;
  description?: string;
  basePrice: number;          // in paise
  unit: "per_day" | "per_event" | "per_hour" | "fixed";
  isPublic: boolean;          // display on public site
  category?: string;
}
```

**Request Body (POST `/api/packages`):**
```typescript
{
  name: string;
  description?: string;
  price: number;              // in paise
  isPublic: boolean;
  serviceIds: string[];       // included services
  validityDays?: number;      // how long package offer is valid
}
```

---

## 13. Delivery Pipeline

**Base path:** `/api/delivery`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/delivery` | viewer+ | List all delivery items |
| GET | `/api/delivery/[id]` | viewer+ | Delivery item detail |
| POST | `/api/delivery` | editor+ | Create delivery record |
| PATCH | `/api/delivery/[id]` | editor+ | Update delivery stage/status |
| DELETE | `/api/delivery/[id]` | manager+ | Delete delivery record |
| POST | `/api/delivery/[id]/upload` | editor+ | Upload deliverable files |
| POST | `/api/delivery/[id]/share` | editor+ | Generate client-facing share link |

**Request Body (POST `/api/delivery`):**
```typescript
{
  bookingId: string;
  type: "photos" | "video" | "highlights" | "album" | "raw_footage" | "other";
  description?: string;
  dueDate?: string;
  assignedEditorId?: string;
}
```

**Request Body (PATCH `/api/delivery/[id]`):**
```typescript
{
  status: "pending" | "in_progress" | "review" | "delivered" | "revision_requested" | "approved";
  stageNotes?: string;
  deliveredAt?: string;
}
```

**Response (POST `/api/delivery/[id]/share`):**
```typescript
{
  data: {
    shareLink: string;        // Client-accessible signed URL or unique token link
    expiresAt: string;        // ISO 8601
  };
  error: null;
}
```

---

## 14. Reviews / Feedback

**Base path:** `/api/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reviews` | viewer+ | List reviews (CRM) |
| GET | `/api/reviews/[id]` | viewer+ | Single review |
| POST | `/api/reviews/request` | editor+ | Send review request to client |
| PATCH | `/api/reviews/[id]` | manager+ | Approve / hide review |
| DELETE | `/api/reviews/[id]` | manager+ | Delete review |
| POST | `/api/reviews/submit` | public | Client submits review (token-gated) |
| GET | `/api/public/reviews` | public | Approved reviews for public site |

**Request Body (POST `/api/reviews/submit` — public, token required):**
```typescript
{
  token: string;              // unique one-time token from review request
  rating: number;             // 1–5
  title?: string;
  body: string;               // min 10 characters
  wouldRecommend: boolean;
  consentToPublish: boolean;
}
```

**Response (GET `/api/reviews`):**
```typescript
{
  data: Array<{
    id: string;
    client: ClientSummary;
    booking: { id: string; eventSummary: string };
    rating: number;
    title: string | null;
    body: string;
    wouldRecommend: boolean;
    status: "pending" | "approved" | "hidden";
    submittedAt: string;
  }>;
  error: null;
  meta: PaginationMeta;
}
```

---

## 15. Settings

**Base path:** `/api/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | authenticated | Get all settings |
| PATCH | `/api/settings/studio` | manager+ | Update studio info |
| PATCH | `/api/settings/branding` | manager+ | Update logo, colours |
| PATCH | `/api/settings/billing` | manager+ | Update bank details, GST number |
| PATCH | `/api/settings/gmail` | manager+ | Update Gmail OAuth connection |
| GET | `/api/settings/gmail/status` | manager+ | Gmail connection status |
| DELETE | `/api/settings/gmail` | manager+ | Disconnect Gmail |

**Request Body (PATCH `/api/settings/studio`):**
```typescript
{
  studioName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
}
```

**Request Body (PATCH `/api/settings/branding`):**
```typescript
{
  logoUrl?: string;           // Supabase Storage path
  primaryColor?: string;      // hex e.g. "#7C3AED"
  accentColor?: string;
  fontFamily?: string;
}
```

**Response (GET `/api/settings`):**
```typescript
{
  data: {
    studio: StudioSettings;
    branding: BrandingSettings;
    billing: BillingSettings;
    gmail: { connected: boolean; email: string | null };
  };
  error: null;
}
```

---

## 16. File Uploads

**Base path:** `/api/uploads`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/uploads/presign` | editor+ | Get presigned upload URL |
| POST | `/api/uploads/confirm` | editor+ | Confirm upload and register in DB |
| DELETE | `/api/uploads/[id]` | manager+ | Delete file |
| GET | `/api/uploads/[id]/url` | editor+ | Get signed download URL |

**Request Body (POST `/api/uploads/presign`):**
```typescript
{
  bucket: "portfolio" | "client-documents" | "pdfs" | "crew-assets" | "branding";
  filename: string;
  contentType: string;        // MIME type e.g. "image/jpeg"
  fileSize: number;           // bytes — server validates max size
  entityType?: string;        // "booking" | "client" | "expense" | "crew"
  entityId?: string;
}
```

**Response (POST `/api/uploads/presign`):**
```typescript
{
  data: {
    uploadUrl: string;        // Presigned PUT URL (5 min TTL)
    storagePath: string;      // path in Supabase Storage
    uploadId: string;         // used in /confirm step
  };
  error: null;
}
```

> [!WARNING]
> File size limits: Images ≤ 20 MB; Videos ≤ 2 GB; Documents (PDF) ≤ 50 MB. Requests exceeding these return `413 Payload Too Large` before the presigned URL is issued.

---

## 17. Public Website Data

**Base path:** `/api/public`

> [!NOTE]
> These endpoints require **no authentication** and are served with ISR caching headers (`Cache-Control: s-maxage=300, stale-while-revalidate=600`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/portfolio` | public | Portfolio items (paginated, filterable) |
| GET | `/api/public/services` | public | Services list |
| GET | `/api/public/packages` | public | Packages list |
| GET | `/api/public/reviews` | public | Approved reviews |
| GET | `/api/public/studio` | public | Studio name, tagline, contact |
| POST | `/api/public/enquiry` | public | Submit enquiry form |

**Query Parameters (GET `/api/public/portfolio`):**
```
category=wedding|pre_wedding|birthday|corporate|other
page=1
pageSize=12
```

**Response (GET `/api/public/portfolio`):**
```typescript
{
  data: Array<{
    id: string;
    title: string;
    category: string;
    coverImageUrl: string;    // public CDN URL
    imageUrls: string[];
    videoUrl: string | null;
    tags: string[];
    shootDate: string | null;
  }>;
  error: null;
  meta: PaginationMeta;
}
```

**Response (GET `/api/public/studio`):**
```typescript
{
  data: {
    studioName: string;
    tagline: string | null;
    phone: string;
    email: string | null;
    city: string;
    state: string;
    logoUrl: string | null;
    socialLinks: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
    };
  };
  error: null;
}
```

---

*API contracts are living documentation. Update this document whenever endpoint shapes change. Breaking changes must increment the API version.*
