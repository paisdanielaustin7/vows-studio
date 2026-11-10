# VOWS Studio — Testing Plan

> **Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Zod · Vercel · GitHub
> **Team:** One developer
> **Principle:** Test what matters. Financial logic must be bulletproof. UI convenience is secondary.

---

## 1. Testing Strategy Overview

### The Testing Pyramid

```
         /\
        /  \
       / E2E \          ← Playwright (10–20 critical flows)
      /--------\
     /Integration\      ← Vitest + Supabase local (RLS, transactions, triggers)
    /------------\
   /  Unit Tests  \     ← Vitest (financial utils, validation schemas, permissions)
  /________________\
```

**Budget of time per tier (solo developer):**

| Tier | Test count target | When written | Time budget |
|---|---|---|---|
| Unit | 60–100 tests | Same sprint as the code | Ongoing |
| Integration | 20–40 scenarios | End of each phase | 1–2 days per phase |
| E2E | 15–20 flows | Before Phase 10 hardening | 3–5 days total |
| Security/Manual | Checklist items | Phase 10 | 2 days |
| UAT | Business owner sessions | Pre-launch | 1–2 sessions |

### What to test vs what not to test

**Test:**
- All financial arithmetic (100% coverage, no exceptions)
- All Zod validation schemas
- All RLS policies on every table
- All document number sequencing (uniqueness under concurrency)
- All audit log triggers
- All critical E2E business flows
- Permission utility functions

**Do not test:**
- Next.js framework internals
- Supabase library internals
- shadcn/ui component rendering (pre-tested by the library)
- CSS appearance / visual regression (too expensive solo)
- Minor UI state (collapsed sidebar, tooltip hover) unless it gates a workflow
- Generated migration files (they're SQL, test their effects via integration tests)

### Testing Tools

| Tool | Purpose | Config file |
|---|---|---|
| **Vitest** | Unit and integration tests | `vitest.config.ts` |
| **Playwright** | End-to-end browser tests | `playwright.config.ts` |
| **Supabase CLI** (`supabase start`) | Local Supabase for integration tests | `.env.test.local` |
| **@supabase/supabase-js** | Supabase client in test helpers | `tests/helpers/supabase.ts` |
| **Faker.js** | Realistic test data generation | Test setup files |

---

## 2. Unit Testing

### Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/finance/**', 'src/lib/validation/**', 'src/lib/permissions/**', 'src/utils/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

### Coverage Targets

| Module | Target | Rationale |
|---|---|---|
| `src/lib/finance/` | **100%** | Monetary errors are business-critical |
| `src/lib/validation/` (Zod schemas) | **100%** | Invalid data must never reach the DB |
| `src/lib/permissions/` | **90%+** | Security boundary |
| `src/utils/` | **80%+** | General utilities |
| React components | Not targeted | Covered by E2E |

---

### 2.1 Financial Calculation Tests

> All amounts are **integer paise** (₹1 = 100 paise). Never use floats.

#### Source file: `src/lib/finance/calculations.ts`

```ts
// src/lib/finance/calculations.ts (interface only — for reference)

export function computeLineTotal(
  unitPricePaise: number,
  quantity: number,
  discountPct: number  // 0–100
): number

export function computeSubtotal(lineItems: LineItem[]): number

export function applyOverallDiscount(
  subtotalPaise: number,
  discountPct: number
): { discountAmountPaise: number; afterDiscountPaise: number }

export function applyTax(
  amountPaise: number,
  taxPct: number  // e.g. 18 for 18% GST
): { taxAmountPaise: number; totalWithTaxPaise: number }

export function computeQuotationTotal(
  lineItems: LineItem[],
  overallDiscountPct: number,
  taxPct: number
): QuotationTotals

export function allocatePayment(
  paymentPaise: number,
  invoices: { id: string; outstandingPaise: number }[]
): AllocationResult[]
```

#### Unit tests: `tests/unit/finance/calculations.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import {
  computeLineTotal,
  computeSubtotal,
  applyOverallDiscount,
  applyTax,
  computeQuotationTotal,
  allocatePayment,
} from '@/lib/finance/calculations'

// ─── Line total ───────────────────────────────────────────────

describe('computeLineTotal', () => {
  it('computes simple line total without discount', () => {
    // ₹5,000 × 2 = ₹10,000 → 1_000_000 paise
    expect(computeLineTotal(500_000, 2, 0)).toBe(1_000_000)
  })

  it('applies per-item discount correctly', () => {
    // ₹10,000 × 1 × (1 - 10%) = ₹9,000 → 900_000 paise
    expect(computeLineTotal(1_000_000, 1, 10)).toBe(900_000)
  })

  it('applies 100% discount resulting in zero', () => {
    expect(computeLineTotal(500_000, 3, 100)).toBe(0)
  })

  it('rounds down (floor) to nearest paise on fractional discount', () => {
    // ₹100 × 1 × (1 - 33.333%) = ₹66.667 → floor to 6666 paise
    expect(computeLineTotal(10_000, 1, 33.333)).toBe(6_667) // adjust per chosen rounding
  })

  it('throws if unitPrice is negative', () => {
    expect(() => computeLineTotal(-100, 1, 0)).toThrow()
  })

  it('throws if quantity is zero or negative', () => {
    expect(() => computeLineTotal(100_000, 0, 0)).toThrow()
    expect(() => computeLineTotal(100_000, -1, 0)).toThrow()
  })

  it('throws if discountPct is out of range', () => {
    expect(() => computeLineTotal(100_000, 1, -5)).toThrow()
    expect(() => computeLineTotal(100_000, 1, 101)).toThrow()
  })
})

// ─── Subtotal ─────────────────────────────────────────────────

describe('computeSubtotal', () => {
  it('sums line totals correctly', () => {
    const items = [
      { unitPricePaise: 500_000, quantity: 2, discountPct: 0 },   // 1_000_000
      { unitPricePaise: 300_000, quantity: 1, discountPct: 10 },  //   270_000
    ]
    expect(computeSubtotal(items)).toBe(1_270_000)
  })

  it('returns 0 for empty item list', () => {
    expect(computeSubtotal([])).toBe(0)
  })
})

// ─── Overall discount ─────────────────────────────────────────

describe('applyOverallDiscount', () => {
  it('applies 10% overall discount', () => {
    const result = applyOverallDiscount(1_000_000, 10)
    expect(result.discountAmountPaise).toBe(100_000)
    expect(result.afterDiscountPaise).toBe(900_000)
  })

  it('applies 0% discount — passthrough', () => {
    const result = applyOverallDiscount(500_000, 0)
    expect(result.discountAmountPaise).toBe(0)
    expect(result.afterDiscountPaise).toBe(500_000)
  })
})

// ─── Tax ──────────────────────────────────────────────────────

describe('applyTax', () => {
  it('applies 18% GST correctly', () => {
    // ₹10,000 × 18% = ₹1,800 → total ₹11,800
    const result = applyTax(1_000_000, 18)
    expect(result.taxAmountPaise).toBe(180_000)
    expect(result.totalWithTaxPaise).toBe(1_180_000)
  })

  it('applies 0% tax — no change', () => {
    const result = applyTax(1_000_000, 0)
    expect(result.taxAmountPaise).toBe(0)
    expect(result.totalWithTaxPaise).toBe(1_000_000)
  })
})

// ─── Full quotation total (combined) ──────────────────────────

describe('computeQuotationTotal', () => {
  it('computes correct total: 2 items + 5% overall discount + 18% GST', () => {
    // Item 1: ₹20,000 × 1 = 2_000_000 paise (no item discount)
    // Item 2: ₹10,000 × 2 × (1 - 10%) = 1_800_000 paise
    // Subtotal: 3_800_000 paise
    // 5% overall discount: −190_000 → 3_610_000 paise
    // 18% GST: +649_800 → 4_259_800 paise
    const items = [
      { unitPricePaise: 2_000_000, quantity: 1, discountPct: 0 },
      { unitPricePaise: 1_000_000, quantity: 2, discountPct: 10 },
    ]
    const result = computeQuotationTotal(items, 5, 18)
    expect(result.subtotalPaise).toBe(3_800_000)
    expect(result.discountAmountPaise).toBe(190_000)
    expect(result.taxAmountPaise).toBe(649_800)
    expect(result.totalPaise).toBe(4_259_800)
  })

  it('returns 0 total for empty items', () => {
    const result = computeQuotationTotal([], 0, 0)
    expect(result.totalPaise).toBe(0)
  })
})
```

---

### 2.2 Payment Allocation Tests

```ts
// tests/unit/finance/allocation.test.ts

describe('allocatePayment', () => {
  it('fully allocates a payment to a single invoice', () => {
    const invoices = [{ id: 'inv-1', outstandingPaise: 1_000_000 }]
    const result = allocatePayment(1_000_000, invoices)
    expect(result).toEqual([{ id: 'inv-1', allocatedPaise: 1_000_000 }])
  })

  it('partially allocates a payment to a single invoice', () => {
    const invoices = [{ id: 'inv-1', outstandingPaise: 1_000_000 }]
    const result = allocatePayment(500_000, invoices)
    expect(result).toEqual([{ id: 'inv-1', allocatedPaise: 500_000 }])
  })

  it('splits payment across multiple invoices (oldest first)', () => {
    const invoices = [
      { id: 'inv-1', outstandingPaise: 400_000 },
      { id: 'inv-2', outstandingPaise: 600_000 },
    ]
    const result = allocatePayment(700_000, invoices)
    expect(result).toEqual([
      { id: 'inv-1', allocatedPaise: 400_000 },
      { id: 'inv-2', allocatedPaise: 300_000 },
    ])
  })

  it('does not allocate more than outstanding on any invoice', () => {
    const invoices = [{ id: 'inv-1', outstandingPaise: 300_000 }]
    const result = allocatePayment(1_000_000, invoices)
    // Over-payment: allocate only up to outstanding
    expect(result[0].allocatedPaise).toBeLessThanOrEqual(300_000)
  })

  it('returns empty allocations for zero payment', () => {
    const invoices = [{ id: 'inv-1', outstandingPaise: 500_000 }]
    const result = allocatePayment(0, invoices)
    expect(result.every(r => r.allocatedPaise === 0)).toBe(true)
  })

  it('total allocated never exceeds payment amount', () => {
    const invoices = [
      { id: 'inv-1', outstandingPaise: 500_000 },
      { id: 'inv-2', outstandingPaise: 500_000 },
      { id: 'inv-3', outstandingPaise: 500_000 },
    ]
    const payment = 800_000
    const result = allocatePayment(payment, invoices)
    const totalAllocated = result.reduce((sum, r) => sum + r.allocatedPaise, 0)
    expect(totalAllocated).toBeLessThanOrEqual(payment)
  })
})
```

---

### 2.3 Validation Schema Tests

```ts
// tests/unit/validation/quotation.test.ts

import { quotationLineItemSchema, createQuotationSchema } from '@/lib/validation/quotation'

describe('quotationLineItemSchema', () => {
  it('accepts valid line item', () => {
    const result = quotationLineItemSchema.safeParse({
      description: 'Wedding photography — full day',
      unitPricePaise: 5_000_000,
      quantity: 1,
      discountPct: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative unit price', () => {
    const result = quotationLineItemSchema.safeParse({
      description: 'Test',
      unitPricePaise: -100,
      quantity: 1,
      discountPct: 0,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('unitPricePaise')
  })

  it('rejects discount > 100', () => {
    const result = quotationLineItemSchema.safeParse({
      description: 'Test',
      unitPricePaise: 100_000,
      quantity: 1,
      discountPct: 150,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = quotationLineItemSchema.safeParse({
      description: '',
      unitPricePaise: 100_000,
      quantity: 1,
      discountPct: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer unit price', () => {
    const result = quotationLineItemSchema.safeParse({
      description: 'Test',
      unitPricePaise: 100.5,  // must be integer paise
      quantity: 1,
      discountPct: 0,
    })
    expect(result.success).toBe(false)
  })
})
```

---

### 2.4 Permission Utility Tests

```ts
// tests/unit/permissions/hasPermission.test.ts

import { hasPermission, canAccessRoute } from '@/lib/permissions'
import type { UserRole } from '@/types'

describe('hasPermission', () => {
  const cases: Array<[UserRole, string, boolean]> = [
    ['system_admin', 'users:manage', true],
    ['staff', 'users:manage', false],
    ['crew_member', 'users:manage', false],
    ['staff', 'quotations:create', true],
    ['crew_member', 'quotations:create', false],
    ['staff', 'invoices:view', true],
    ['crew_member', 'invoices:view', false],
    ['system_admin', 'invoices:view', true],
  ]

  it.each(cases)('%s can %s: %s', (role, permission, expected) => {
    expect(hasPermission(role, permission)).toBe(expected)
  })
})

describe('canAccessRoute', () => {
  it('crew_member cannot access /admin/*', () => {
    expect(canAccessRoute('crew_member', '/admin/users')).toBe(false)
  })

  it('system_admin can access /admin/*', () => {
    expect(canAccessRoute('system_admin', '/admin/users')).toBe(true)
  })

  it('unauthenticated cannot access /crm/*', () => {
    expect(canAccessRoute(null, '/crm/clients')).toBe(false)
  })
})
```

---

## 3. Integration Testing

### Setup

Integration tests run against a local Supabase instance (`supabase start`). Each test suite resets the relevant tables before running.

```ts
// tests/integration/setup.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,       // http://127.0.0.1:54321
  process.env.SUPABASE_SERVICE_KEY! // local service role key (never committed)
)

export async function resetTable(tableName: string) {
  await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

// Seed helpers
export async function seedUser(role: string) { /* ... */ }
export async function seedClient() { /* ... */ }
export async function seedQuotation(clientId: string) { /* ... */ }
export async function seedInvoice(bookingId: string) { /* ... */ }
```

---

### 3.1 RLS Policy Tests

#### Scenario: Crew member cannot read other crew member's private data

```ts
// tests/integration/rls/crew.test.ts

describe('RLS: crew_members table', () => {
  let crewUserAClient: SupabaseClient
  let crewUserBClient: SupabaseClient
  let crewAId: string

  beforeAll(async () => {
    // Create two crew users and sign them in with their own clients
    const { userId: idA, authClient: clientA } = await seedCrewUser('crew-a@test.com')
    const { userId: idB, authClient: clientB } = await seedCrewUser('crew-b@test.com')
    crewAId = idA
    crewUserAClient = clientA
    crewUserBClient = clientB

    // Seed crew member record for user A with private rate info
    await supabase.from('crew_members').insert({
      profile_id: crewAId,
      name: 'Crew A',
      rate_per_day: 500_000, // ₹5,000
    })
  })

  it('crew member A can read their own crew record', async () => {
    const { data, error } = await crewUserAClient
      .from('crew_members')
      .select('*')
      .eq('profile_id', crewAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('crew member B cannot read crew member A's rate', async () => {
    const { data, error } = await crewUserBClient
      .from('crew_members')
      .select('rate_per_day')
      .eq('profile_id', crewAId)
    // Expect empty result (RLS filters it out) or error
    expect(data).toHaveLength(0)
  })
})
```

#### Scenario: Staff cannot read admin-only audit log details

```ts
describe('RLS: audit_logs table', () => {
  it('staff user gets empty result when querying audit_logs', async () => {
    const { data } = await staffClient.from('audit_logs').select('*').limit(10)
    expect(data).toHaveLength(0)
  })

  it('system_admin can read all audit_logs', async () => {
    const { data } = await adminClient.from('audit_logs').select('*').limit(10)
    expect(data!.length).toBeGreaterThan(0)
  })
})
```

---

### 3.2 Financial Transaction Integrity

#### Scenario: Two simultaneous payment recordings don't corrupt state

```ts
// tests/integration/transactions/concurrent-payments.test.ts

describe('Concurrent payment allocation', () => {
  it('two simultaneous payments to same invoice do not over-allocate', async () => {
    const invoiceId = await seedInvoice({ totalAmountPaise: 1_000_000 })

    // Simulate two concurrent payment recordings of ₹8,000 each
    const [result1, result2] = await Promise.all([
      recordAndAllocatePayment({ invoiceId, amountPaise: 800_000 }),
      recordAndAllocatePayment({ invoiceId, amountPaise: 800_000 }),
    ])

    // Fetch actual allocations from DB
    const { data: allocations } = await supabase
      .from('payment_allocations')
      .select('allocated_amount')
      .eq('invoice_id', invoiceId)

    const totalAllocated = allocations!.reduce(
      (sum, a) => sum + a.allocated_amount, 0
    )

    // Must never exceed invoice total
    expect(totalAllocated).toBeLessThanOrEqual(1_000_000)
  })
})
```

---

### 3.3 Document Sequencing

#### Scenario: Concurrent quotation creation produces no duplicate numbers

```ts
describe('Quotation number sequencing', () => {
  it('50 concurrent quotation creations produce 50 unique numbers', async () => {
    const creates = Array.from({ length: 50 }, () =>
      supabase.rpc('create_quotation_with_number', { client_id: testClientId })
    )
    const results = await Promise.all(creates)
    const numbers = results.map(r => r.data?.quotation_number)
    const unique = new Set(numbers)
    expect(unique.size).toBe(50)
  })
})
```

---

### 3.4 Audit Log Triggers

#### Scenario: Every settings change is logged

```ts
describe('Audit log triggers', () => {
  it('updating business profile creates audit log entry', async () => {
    const before = await countAuditLogs()

    await adminClient
      .from('business_settings')
      .update({ business_name: 'VOWS Studio Updated' })
      .eq('id', settingsId)

    const after = await countAuditLogs()
    expect(after).toBe(before + 1)

    const { data: log } = await adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(log.table_name).toBe('business_settings')
    expect(log.action).toBe('UPDATE')
    expect(log.new_value.business_name).toBe('VOWS Studio Updated')
  })

  it('deleting a client creates audit log entry with old_value', async () => {
    const clientId = await seedClient({ name: 'Test Client' })
    const before = await countAuditLogs()

    await adminClient.from('clients').delete().eq('id', clientId)

    const after = await countAuditLogs()
    expect(after).toBe(before + 1)

    const { data: log } = await adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    expect(log.action).toBe('DELETE')
    expect(log.old_value.name).toBe('Test Client')
  })
})
```

---

### 3.5 Cascade Behaviour

#### Scenario: Cancelling a booking updates related invoice status

```ts
describe('Booking cancellation cascades', () => {
  it('cancelling a booking marks pending invoices as cancelled', async () => {
    const bookingId = await seedBookingWithInvoice({ invoiceStatus: 'sent' })

    await adminClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    const { data: invoice } = await adminClient
      .from('invoices')
      .select('status')
      .eq('booking_id', bookingId)
      .single()

    expect(invoice!.status).toBe('cancelled')
  })
})
```

---

## 4. End-to-End Testing (Playwright)

### Configuration

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
```

**Shared fixture** — `tests/e2e/fixtures/auth.ts`:
- `adminPage`: authenticated Playwright page as `system_admin`
- `staffPage`: authenticated page as `staff`
- `crewPage`: authenticated page as `crew_member`
- `publicPage`: unauthenticated page

---

### E2E Flow 1: Login → MFA → Dashboard (each role)

**Pre-conditions:**
- MFA enrolled for `system_admin` and `staff` test users
- All three role accounts exist in dev Supabase

**Steps (system_admin):**
1. Navigate to `/login`
2. Enter admin email and password → click "Sign in"
3. Assert redirect to `/auth/mfa`
4. Enter valid TOTP code
5. Assert redirect to `/admin/dashboard`
6. Assert sidebar contains "System Admin" section
7. Assert page title is "Dashboard"

**Steps (crew_member):**
1. Navigate to `/login`
2. Enter crew email and password → click "Sign in"
3. Assert redirect directly to `/crm/schedule` (no MFA for crew)
4. Assert sidebar does NOT contain "Invoices" or "Clients"

**Assertions:**
- Correct layout per role
- Forbidden routes return 403, not blank page

---

### E2E Flow 2: Create Enquiry → Build Quotation → Download PDF

**Pre-conditions:**
- Logged in as `staff`
- At least one client exists

**Steps:**
1. Navigate to `/crm/enquiries/new`
2. Select existing client from autocomplete
3. Fill event type, event date, source → click "Save Enquiry"
4. Assert enquiry appears in list with status "New"
5. Click enquiry → "Create Quotation"
6. Add 3 line items with descriptions, prices, quantities, and discounts
7. Set overall discount to 5%, tax to 18%
8. Assert grand total matches expected calculation
9. Click "Save as Draft"
10. Click "Generate PDF"
11. Assert PDF download initiates (file name matches `QT-YYYY-NNNN.pdf`)
12. Click "Mark as Sent" → assert status updates to "Sent"

**Assertions:**
- Quotation total matches manual calculation
- PDF file downloads without error
- Status transition reflected in UI

---

### E2E Flow 3: Accept Quotation → Create Booking → Assign Crew

**Pre-conditions:**
- Logged in as `staff`
- Quotation in "Sent" status exists

**Steps:**
1. Navigate to quotation detail
2. Click "Mark as Accepted"
3. Click "Convert to Booking"
4. Confirm booking details → click "Confirm Booking"
5. Assert booking created with status "Confirmed"
6. Click "Add Event" → fill event details (date, time, venue, type)
7. Click "Assign Crew" → search for crew member
8. Select crew member → assign role "Lead Photographer"
9. Click "Save Assignment"
10. Assert assignment appears in event crew list
11. Attempt to assign the same crew member to an overlapping event
12. Assert conflict warning appears and prevents save

**Assertions:**
- Booking number format: `BK-YYYY-NNNN`
- Crew conflict detection works
- Crew assignment visible in crew member's schedule

---

### E2E Flow 4: Generate Invoice → Record Payment → Download Receipt

**Pre-conditions:**
- Logged in as `staff`
- Booking in "Completed" status exists

**Steps:**
1. Navigate to booking detail
2. Click "Generate Invoice"
3. Assert invoice pre-filled with booking items
4. Edit one item amount → click "Save Invoice"
5. Click "Send Invoice" (triggers email if Gmail connected, otherwise logs it)
6. Assert invoice status is "Sent"
7. Click "Record Payment"
8. Enter amount = 50% of invoice total, method = "Bank Transfer", reference = "TXN001"
9. Click "Save Payment"
10. Assert invoice status changes to "Partially Paid"
11. Assert outstanding balance = invoice total − payment
12. Record second payment for remaining amount
13. Assert invoice status changes to "Paid"
14. Assert receipt generated → click "Download Receipt"
15. Assert PDF downloads with correct receipt number

**Assertions:**
- Outstanding balance arithmetic is exact
- Invoice status machine transitions correctly
- Receipt PDF downloads

---

### E2E Flow 5: Submit Public Enquiry Form → Appears in CRM

**Pre-conditions:**
- Public website running (or dev environment)
- CRM staff logged in in a separate tab

**Steps:**
1. Navigate to `/enquiry` (public page, unauthenticated)
2. Fill: name, email, phone, event type, preferred date, message
3. Click "Submit Enquiry"
4. Assert success message appears on public page
5. In CRM, navigate to `/crm/enquiries`
6. Assert new enquiry appears with source "Website"
7. Assert client record was created (or matched to existing) with correct name/email

**Assertions:**
- No auth required for public form submission
- Spam/bot protection (honeypot or reCAPTCHA) does not block legitimate submission
- Enquiry data matches what was submitted

---

### E2E Flow 6: Admin Creates User → User Accepts Invitation → Sets Up MFA

**Pre-conditions:**
- Logged in as `system_admin`
- Test email inbox accessible (or use Supabase local email)

**Steps:**
1. Navigate to `/admin/users/invite`
2. Enter new user's email, select role "Staff"
3. Click "Send Invitation"
4. Assert success message and user appears in list with status "Invited"
5. Open invitation email → click magic link
6. Assert redirect to set-password page
7. Set password → submit
8. Assert redirect to MFA setup page (mandatory for `staff`)
9. Scan QR code with authenticator app → enter TOTP code
10. Assert MFA enabled → redirect to dashboard
11. As admin, verify user now shows "Active" and "MFA: Enabled"

**Assertions:**
- MFA setup is enforced — cannot skip it for `staff` role
- User appears in admin user list
- Audit log records user creation and MFA enablement

---

## 5. Security Testing

Manual security checklist — perform during Phase 10 hardening:

### Authentication & Authorisation
- [ ] Cannot access any `/crm/*` route without being logged in — verify redirect to `/login`
- [ ] Cannot access any `/admin/*` route without `system_admin` role — verify 403
- [ ] Cannot escalate own role: attempt `PATCH /api/users/self` with `{ role: 'system_admin' }` → verify 403
- [ ] Cannot access another user's data: change URL ID from your record to another user's → verify 404 or 403

### Data Access
- [ ] Cannot download a document (quotation/invoice PDF) by guessing the Storage path — Storage bucket must be private with signed URL only
- [ ] Signed URL expires after configured time (e.g. 60 seconds) — verify URL no longer works after expiry
- [ ] RLS blocks direct Supabase queries: use Supabase JS client with another user's JWT and attempt to read their invoices

### Input Validation
- [ ] SQL injection: attempt `'; DROP TABLE clients; --` in all text inputs — verify no DB error leaks to UI
- [ ] XSS: attempt `<script>alert('xss')</script>` in client name, notes, all free-text fields — verify no script executes when viewing the record
- [ ] XSS in PDF: attempt injecting HTML in line item description — verify PDF renders it as text

### Transport & Cookies
- [ ] CSRF: verify auth cookie has `SameSite=Lax` or `Strict` (inspect in browser DevTools)
- [ ] All requests over HTTPS in production — verify no mixed content warnings
- [ ] No sensitive data in URL parameters (tokens, IDs in query strings) — check network log

### Rate Limiting
- [ ] Login endpoint: submit 20 failed login attempts in 60 seconds — verify lockout or slowdown
- [ ] Public enquiry form: submit 10 times in 30 seconds — verify rate limiting kicks in

### Environment
- [ ] Run `grep -r "SUPABASE_SERVICE_KEY\|service_role" src/` — zero matches (service key must never be in `src/`)
- [ ] Run `next build && grep -r "supabase_service" .next/` — zero matches in client bundle
- [ ] Verify all Supabase Storage buckets are "Private" in dashboard (except explicitly public CDN assets)

---

## 6. Financial Testing

> These tests verify business accuracy. Each can be run as an integration test against local Supabase.

### Rules
1. **All amounts in integer paise.** No `parseFloat`, no `toFixed`, no division without `Math.floor`.
2. All DB columns holding money are `bigint` (not `decimal` or `float`).
3. Display conversion: `paise / 100` for rendering, never stored.

### Test Cases

| # | Test | Formula | Pass Criteria |
|---|---|---|---|
| F-01 | Quotation total | `sum(unit_price × qty × (1 − item_discount/100)) × (1 − overall_discount/100) × (1 + tax/100)` | Matches DB `total_amount` to the paise |
| F-02 | Invoice total matches quotation | On conversion, `invoice.total_amount === quotation.total_amount` | Exact match, no rounding drift |
| F-03 | Partial payment outstanding | `invoice.total_amount − sum(allocations)` | Accurate after each payment |
| F-04 | Full payment outstanding | After final payment allocation, outstanding = 0 | Exact zero |
| F-05 | Over-allocation prevention | Attempt to allocate more than outstanding | DB constraint or Zod rejects it |
| F-06 | Ledger income matches payments | `sum(ledger_entries WHERE type='income')` = `sum(payments)` for same period | Exact match |
| F-07 | P&L calculation | `total_income − total_expenses` for a date range | Matches manual sum |
| F-08 | Multiple currency entries | 10 payments of varying amounts, then verify sum | No floating-point drift |

### Test Execution

```bash
# Run financial unit tests only
pnpm vitest run tests/unit/finance/

# Run financial integration tests
pnpm vitest run tests/integration/financial/

# Manual spot-check script
npx tsx tests/scripts/verify-financial-integrity.ts
```

The verify script selects the 10 most recent invoices and recomputes their totals from raw `invoice_items` rows, comparing to `invoices.total_amount`. Any mismatch is an alert.

---

## 7. UAT (User Acceptance Testing)

UAT is conducted with the actual VOWS Studio business owner, not the developer. It is not technical — it validates that the system matches how the business actually works.

### Who conducts UAT
- **Tester:** Business owner (non-technical)
- **Observer:** Developer (present to note issues, not to guide clicks)
- **Sessions:** 2 sessions of 90 minutes each — before launch and after bug fixes

### UAT Test Scripts

#### UAT-01: Managing a New Enquiry
> *"A new couple called you asking about their wedding in December. Enter their enquiry into the system."*

User should:
- Create a new client for the couple
- Add an enquiry with their event details
- Set a follow-up reminder
- Verify the enquiry appears in the enquiry list

Pass if: Enquiry is visible, follow-up date is correct, client details saved correctly.

#### UAT-02: Building and Sending a Quotation
> *"The couple wants a quotation. Build one with photography + videography packages and send it to them."*

User should:
- Open the enquiry → create quotation
- Add at least 2 service line items
- Apply a complimentary discount
- Preview the quotation
- Send it to the client's email (if Gmail connected) or download the PDF

Pass if: PDF looks professional, amounts are correct as stated by user, email sent successfully.

#### UAT-03: Confirming a Booking
> *"The couple accepted your quotation. Confirm their booking."*

User should:
- Accept the quotation
- Convert to booking
- Add the ceremony event details
- Add crew assignments

Pass if: Booking appears in the booking list and calendar.

#### UAT-04: Recording a Payment
> *"The couple paid an advance of ₹20,000 by bank transfer. Record it."*

User should:
- Open the booking
- Generate invoice
- Record the ₹20,000 payment against the invoice
- Download the receipt for the client

Pass if: Invoice shows "Partially Paid", outstanding balance is correct, receipt PDF downloads.

#### UAT-05: Finding Outstanding Invoices
> *"Which clients owe you money right now?"*

User should:
- Navigate to outstanding receivables view
- Identify clients with unpaid balances

Pass if: User can find the information within 60 seconds without guidance.

### Feedback Collection

After each UAT session, collect:
1. **What worked well** (do not change)
2. **What was confusing** (UX issues, label changes, flow reordering)
3. **What was missing** (gaps in functionality)
4. **Blockers** (things that would prevent business operation)

Log all items in a `UAT_FEEDBACK.md` document. Blockers must be resolved before launch. Confusion items should be fixed. Missing non-critical items move to post-MVP backlog.

### Sign-off Criteria

The business owner signs off when:
- [ ] All 5 UAT scripts pass without developer intervention
- [ ] All blocker items resolved
- [ ] Business owner confirms: "I could use this for a real client tomorrow"

---

## 8. Performance Testing

### Targets

| Metric | Target | Tool |
|---|---|---|
| Dashboard LCP | < 2 seconds | Lighthouse / Web Vitals |
| Portfolio page LCP | < 3 seconds | Lighthouse |
| Quotation PDF generation | < 5 seconds (server-side) | Manual timer / server log |
| API response time (p95) | < 500ms | Vercel Analytics |
| CRM page navigation | < 1 second | Web Vitals |

### Load Scenarios

| Scenario | Setup | Measured with |
|---|---|---|
| Dashboard with 100+ bookings | Seed 150 bookings in dev DB | Chrome DevTools + Lighthouse |
| Client list with 500+ clients | Seed 500 clients | Measure first render time |
| Ledger with 1000+ entries | Seed 1200 ledger entries | Measure filter + sort ops |
| Portfolio page with 50+ images | Upload 50 test images | Lighthouse (image optimisation) |

### How to Measure

```bash
# Lighthouse CLI
npx lighthouse http://localhost:3000/crm/dashboard --output html --output-path ./lighthouse-report.html

# Check DB query times (enable pg_stat_statements in Supabase dev)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Optimisation Checklist (if targets missed)

- [ ] Paginate all lists (default page size 25–50)
- [ ] Add DB indexes on foreign keys and frequently filtered columns (`status`, `created_at`, `client_id`)
- [ ] Dashboard: parallel data fetching with `Promise.all`, not sequential awaits
- [ ] Images: `next/image` with correct `sizes` prop, WebP format
- [ ] PDF generation: cache generated PDF in Storage, regenerate only on change

---

## 9. Test Environment Strategy

### Local Development

| Tool | Config |
|---|---|
| `supabase start` | Runs local Postgres + Auth + Storage at `localhost:54321` |
| `.env.test.local` | Points to local Supabase; never committed |
| `pnpm vitest` | Runs all unit and integration tests |
| `pnpm playwright test` | Runs E2E against `localhost:3000` |

```bash
# Full local test run
supabase start
pnpm dev &          # start Next.js in background
pnpm vitest run     # unit + integration
pnpm playwright test # E2E
```

### CI (GitHub Actions)

Trigger: every pull request into `dev` or `main`

```yaml
# .github/workflows/test.yml (outline)
name: Test Suite
on: [pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm vitest run --reporter=verbose
      # E2E intentionally omitted from CI — too slow and requires Supabase
```

> [!NOTE]
> E2E tests are **not** run in CI because they require a running Supabase instance and a Next.js dev server. They are run manually against the Vercel preview deployment before merging.

### Preview (Vercel + Dev Supabase)

- Every PR gets a Vercel preview URL
- Preview deployments use the dev Supabase project
- Before merging to `dev`, manually run critical E2E flows against the preview URL:

```bash
PLAYWRIGHT_BASE_URL=https://vows-studio-pr-123.vercel.app pnpm playwright test
```

### Production

> [!CAUTION]
> **No automated tests run against the production database.** Production is not a test environment. Seed data, test transactions, and playwright scripts must never target production Supabase.

Production verification is limited to:
- Smoke test: log in as admin, navigate to dashboard, check KPIs load
- Uptime monitoring alert if any route returns 500
- Vercel Analytics for real-time performance metrics

### Environment Variable Matrix

| Variable | Local dev | CI | Vercel Preview | Vercel Prod |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Local Supabase | — | Dev Supabase | Prod Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local anon key | — | Dev anon key | Prod anon key |
| `SUPABASE_SERVICE_KEY` | Local service key | — | Dev service key | Prod service key |
| `GOOGLE_CLIENT_ID` | Dev OAuth client | — | Dev OAuth client | Prod OAuth client |
| `GOOGLE_CLIENT_SECRET` | Dev secret | — | Dev secret | Prod secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Local random key | — | Dev random key | Prod random key (rotate on breach) |

> [!IMPORTANT]
> `SUPABASE_SERVICE_KEY` and `GOOGLE_TOKEN_ENCRYPTION_KEY` are **server-only**. They must never use the `NEXT_PUBLIC_` prefix and must never appear in any `src/` file or client bundle.
