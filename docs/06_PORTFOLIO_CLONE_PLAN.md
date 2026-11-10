# VOWS Studio — Portfolio Clone & Demo Deployment Plan
> **Reconciled 2026-11-10.** Where this document disagrees with DECISION_LOG.md or GLOSSARY_AND_ENUMS.md, those files win.


> [!CAUTION]
> This document governs the creation and maintenance of the VOWS Studio demo environment. The **absolute rule** is: no real VOWS business data, credentials, or photographs may ever appear in the demo environment. Any violation is a serious privacy and security breach.

---

## Table of Contents

1. [Architecture of Demo Separation](#1-architecture-of-demo-separation)
2. [What Demo Mode Does](#2-what-demo-mode-does)
3. [Demo Data Strategy](#3-demo-data-strategy)
4. [Demo Seeding Process](#4-demo-seeding-process)
5. [Demo Login Accounts](#5-demo-login-accounts)
6. [What Must NEVER Be in Demo](#6-what-must-never-be-in-demo)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Maintenance](#8-maintenance)

---

## 1. Architecture of Demo Separation

The demo/portfolio environment is **completely independent** from the production VOWS Studio system at every layer.

### Infrastructure Isolation

```
┌─────────────────────────────────┐    ┌─────────────────────────────────────┐
│  PRODUCTION                     │    │  DEMO / PORTFOLIO                   │
│  ─────────                      │    │  ────────────────                   │
│  Supabase Project: vows-prod    │    │  Supabase Project: vows-demo        │
│  URL: xxxx.supabase.co          │    │  URL: yyyy.supabase.co              │
│  Vercel Project: vows-studio    │    │  Vercel Project: vows-studio-demo   │
│  Domain: vows.studio (private)  │    │  Domain: demo.vows.studio (public)  │
│  GitHub Repo: vows-studio       │    │  GitHub Repo: same repository (separate project)      │
└─────────────────────────────────┘    └─────────────────────────────────────┘
              ↑                                           ↑
         No network connection between these two environments
```

### Key Separation Principles

| Concern | Production | Demo |
|---|---|---|
| Supabase Project | `vows-prod` (private) | `vows-demo` (separate project) |
| Supabase URL | Private | Different URL |
| Supabase Anon Key | Private | Different key |
| Supabase Service Role Key | Private, server-only | Different key, demo project only |
| Google OAuth Credentials | Production Client ID/Secret | Either a **separate** Google Cloud app, or same app with demo redirect URIs but **tokens never connected** in demo |
| GitHub Repository | `vows-studio` (private) | `vows-studio-demo` (separate repo, no production history) |
| `.env` files | Production secrets | Demo secrets (demo project only) |
| Deployment | Vercel production project | Separate Vercel project |

### Environment Variable Gate

The `NEXT_PUBLIC_APP_MODE` environment variable controls demo behaviour throughout the application:

```typescript
// lib/config.ts
export const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE ?? 'production'
export const IS_DEMO = APP_MODE === 'demo'
```

This single boolean gates every demo-specific behaviour described in Section 2.

### Repository Setup

The demo repository (`vows-studio-demo`) is created as follows:

```bash
# Create a clean copy — NO git history from production
mkdir vows-studio-demo
cd vows-studio-demo
git init
git remote add origin git@github.com:your-org/vows-studio-demo.git

# Copy source files (not git history)
cp -r ../vows-studio/. .
rm -rf .git/refs/remotes  # Ensure no remote links

# Add demo .env
cp .env.example .env.local
# Fill in demo Supabase credentials
```

> [!CAUTION]
> **Never** fork or clone from the production repository in a way that retains git history containing production secrets or real data. Start from a clean copy of the source files only.

---

## 2. What Demo Mode Does

When `NEXT_PUBLIC_APP_MODE=demo`, the application behaves differently in the following ways.

### 2.1 Disabled Features

#### Real Gmail Sending

The send email button is **replaced** with a simulation:

```typescript
// lib/gmail/client.ts
export async function sendEmail(params: SendEmailParams) {
  if (IS_DEMO) {
    // Simulate success — no real API call
    await sleep(1200)  // Realistic delay
    return { success: true, messageId: 'demo-' + Date.now(), simulated: true }
  }
  // Real implementation...
}
```

The UI shows a success toast: *"✓ Email Sent (Demo) — No real email was delivered."*

The activity log records: `action: 'email_sent_demo'`.

#### Real PDF Business Information

PDFs are still generated (to demonstrate the feature), but:
- Business name, address, phone, email come from the demo `business_settings` row (Lumina Studio)
- No real VOWS branding, logo, or signature
- A watermark is added: **"DEMO — NOT A REAL DOCUMENT"** in light grey diagonal text

#### Real Payment Recording

Payment entries can be created in the UI to demonstrate the workflow, but:
- No Razorpay integration is active
- No real bank details are stored or displayed
- The bank account shown is `XXXX-DEMO` (see Section 3)
- Payment links return a simulated "payment successful" response

#### External Notifications

- WhatsApp sending: simulated (`IS_DEMO` check in the WhatsApp client)
- SMS sending: simulated
- Webhook dispatches: blocked entirely in demo mode

### 2.2 Enabled Features

| Feature | Behaviour in Demo |
|---|---|
| Full UI and all pages | All screens navigable with pre-seeded data |
| Enquiry → Booking workflow | Fully functional end-to-end (creates demo records) |
| Quotation creation & line items | Fully functional |
| Invoice generation | Fully functional |
| Delivery pipeline | All stages interactive |
| Expense tracking | Fully functional |
| Portfolio management | Pre-seeded images displayed, upload works |
| Staff management (view) | Read-only for most roles as per RBAC |
| Dashboard metrics | Live Realtime updates work (within demo data) |
| PDF preview | Real PDF generated with Lumina Studio branding + DEMO watermark |
| Demo login accounts | One per role (see Section 5) |
| Role switching demo | Logout and login as different role to see RBAC differences |

### 2.3 UI Indicators in Demo Mode

A persistent **demo mode banner** is shown at the top of every page:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎭  DEMO MODE  —  Lumina Studio  |  No real data. No emails sent.      │
│  This is a portfolio demonstration of VOWS Studio.   [Hide for session] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Demo Data Strategy

All demo data uses **Lumina Studio** — a fictitious photography and videography business.

### 3.1 Synthetic Business Profile

```json
{
  "business_name": "Lumina Studio",
  "tagline": "Capturing Moments, Creating Memories",
  "address": "12, MG Road, Indiranagar, Bengaluru, Karnataka - 560038",
  "phone": "+91 98400 00001",
  "email": "hello@luminastudio.demo",
  "website": "https://luminastudio.demo",
  "gstin": "29DEMO0000D1Z5",
  "pan": "DEMOXX0001P",
  "bank_name": "Demo Bank Ltd",
  "account_number": "XXXX-XXXX-DEMO",
  "ifsc": "DEMO0000001",
  "brand_primary_color": "#1a3c5e",
  "brand_accent_color": "#c9a84c",
  "currency": "INR",
  "timezone": "Asia/Kolkata"
}
```

**Logo:** A simple SVG placeholder logo — a camera icon with "Lumina Studio" text. Created as an original SVG, not derived from any real brand. Stored in the demo `brand-assets` bucket.

**Signature:** A simple stylised text signature "Lumina Studio" in a script-style font, generated as an SVG.

> [!NOTE]
> The GSTIN and PAN are clearly fake/demo values. The phone number uses the `+91 984XX XXXXX` range which begins with digits that are not assigned to real subscribers in the typical demo/test convention.

### 3.2 Synthetic Client Records

Minimum of **12 fictional client profiles** covering a range of statuses:

| # | Name | Phone | Email | City | Status |
|---|---|---|---|---|---|
| 1 | Arjun Nair | +91 00000 00101 | arjun.nair@demo.email | Bengaluru | Active Booking |
| 2 | Priya Sharma | +91 98400 00102 | priya.sharma@demo.email | Mysuru | Enquiry |
| 3 | Rohan Verma | +91 98400 00103 | rohan.verma@demo.email | Bengaluru | Completed |
| 4 | Sneha Pillai | +91 98400 00104 | sneha.pillai@demo.email | Mangaluru | Completed |
| 5 | Karthik Reddy | +91 98400 00105 | karthik.reddy@demo.email | Bengaluru | Enquiry |
| 6 | Deepa Krishnan | +91 98400 00106 | deepa.krishnan@demo.email | Hubballi | Active Booking |
| 7 | Vikram Rao | +91 98400 00107 | vikram.rao@demo.email | Bengaluru | Lead |
| 8 | Ananya Iyer | +91 98400 00108 | ananya.iyer@demo.email | Udupi | Completed |
| 9 | Suresh Patil | +91 98400 00109 | suresh.patil@demo.email | Bengaluru | Cancelled |
| 10 | Meera Nambiar | +91 98400 00110 | meera.nambiar@demo.email | Kochi | Completed |
| 11 | Aditya Hegde | +91 98400 00111 | aditya.hegde@demo.email | Bengaluru | Active Booking |
| 12 | Lavanya Swamy | +91 98400 00112 | lavanya.swamy@demo.email | Bengaluru | Lead |

> [!NOTE]
> All phone numbers use the `98400 001XX` range, clearly synthetic. All email addresses use `@demo.email` — a domain that does not deliver mail. All names are common Indian names chosen with regional diversity; none are associated with real persons.

### 3.3 Synthetic Quotations

| # | Client | Service | Amount (INR) | Status |
|---|---|---|---|---|
| Q2024-001 | Arjun Nair | Wedding Photography + Videography | ₹1,85,000 | Accepted |
| Q2024-002 | Priya Sharma | Pre-Wedding + Wedding | ₹2,20,000 | Sent |
| Q2024-003 | Karthik Reddy | Engagement Shoot | ₹35,000 | Draft |
| Q2024-004 | Deepa Krishnan | Wedding Photography | ₹1,20,000 | Accepted |
| Q2024-005 | Vikram Rao | Corporate Event Coverage | ₹45,000 | Rejected |
| Q2024-006 | Aditya Hegde | Pre-Wedding + Wedding + Cinematic | ₹2,75,000 | Sent |

### 3.4 Synthetic Bookings

| # | Client | Event Type | Event Date | Venue | Status |
|---|---|---|---|---|---|
| BK-2024-001 | Arjun Nair | Wedding | 2024-02-15 | The Leela Palace, Bengaluru | Delivered |
| BK-2024-002 | Deepa Krishnan | Wedding | 2024-11-30 | Taj West End, Bengaluru | Confirmed |
| BK-2024-003 | Aditya Hegde | Pre-Wedding | 2024-12-10 | Coorg (outdoor) | Confirmed |
| BK-2024-004 | Rohan Verma | Wedding | 2024-01-08 | Sterling Resort, Mysuru | Delivered |
| BK-2024-005 | Sneha Pillai | Reception | 2024-03-22 | Mangalore Club | Delivered |

**BK-2024-001 (fully delivered)** has a complete delivery pipeline history demonstrating all stages:
- Raw files uploaded → Edited gallery (450 photos, 2 films) → Client preview link sent → Revisions received → Final delivery → Client approved

### 3.5 Synthetic Invoices and Payments

| Invoice | Booking | Total | Paid | Balance | Status |
|---|---|---|---|---|---|
| INV-2024-001 | BK-2024-001 | ₹1,85,000 | ₹1,85,000 | ₹0 | Paid |
| INV-2024-002 | BK-2024-002 | ₹1,20,000 | ₹60,000 | ₹60,000 | Partial |
| INV-2024-003 | BK-2024-003 | ₹2,75,000 | ₹82,500 | ₹1,92,500 | Partial |
| INV-2024-004 | BK-2024-004 | ₹95,000 | ₹95,000 | ₹0 | Paid |
| INV-2024-005 | BK-2024-005 | ₹65,000 | ₹0 | ₹65,000 | **Overdue** |

**INV-2024-005** is overdue (due date: 2024-04-30, past today) — demonstrates the overdue invoice highlight and follow-up workflow.

Payment methods used across demo payments: `bank_transfer`, `cash`, `upi` — demonstrates all supported methods.

### 3.6 Synthetic Portfolio Images

**Source:** Unsplash (free for commercial use, no attribution required under Unsplash License) and Pexels (CC0 / Pexels License).

> [!IMPORTANT]
> Before using any image, confirm the specific license at the time of download. The Unsplash License permits commercial use without attribution but prohibits redistribution as a standalone image product. Pexels images are CC0 or Pexels-licensed. Keep a record of each image's source URL and license.

**Planned image categories:**

| Category | Count | Notes |
|---|---|---|
| Wedding Ceremonies | 12 | Diverse — outdoor, indoor, both South and North Indian styles |
| Pre-Wedding Shoots | 8 | Natural light, scenic Karnataka locations |
| Receptions | 6 | Candid and posed |
| Corporate Events | 4 | Conference/event photography |
| Portfolio Hero | 2 | Hero banner images for portfolio page |

**Image license log file:** `supabase/seed/portfolio-image-sources.csv`

```csv
filename,source_url,license,downloaded_date
wedding-001.jpg,https://unsplash.com/photos/xxxx,Unsplash License,2024-11-01
wedding-002.jpg,https://www.pexels.com/photo/xxxx,Pexels License,2024-11-01
...
```

This CSV must be maintained and committed to the demo repository.

### 3.7 Synthetic Reviews

| # | Reviewer | Rating | Review Text (abbreviated) | Status |
|---|---|---|---|---|
| 1 | Arjun & Pooja Nair | ⭐⭐⭐⭐⭐ | "Lumina Studio made our wedding day magical…" | Approved |
| 2 | Rohan & Divya Verma | ⭐⭐⭐⭐⭐ | "Every single photograph is a masterpiece…" | Approved |
| 3 | Sneha & Rahul Pillai | ⭐⭐⭐⭐⭐ | "Professional, punctual, and incredibly talented…" | Approved |
| 4 | Ananya & Surya Iyer | ⭐⭐⭐⭐ | "Beautiful work, the cinematic video made us cry…" | Approved |
| 5 | Meera & Vinod Nambiar | ⭐⭐⭐⭐⭐ | "We've received so many compliments on our photos…" | Approved |
| 6 | Ravi & Sindhu Hegde | ⭐⭐⭐⭐⭐ | "Lumina Studio's team was present for every moment…" | Pending |

Review #6 is in `Pending` status to demonstrate the moderation workflow.

---

## 4. Demo Seeding Process

### 4.1 Seed Files Location

```
supabase/
└── seed/
    ├── 00_business_settings.sql
    ├── 01_users.sql          — Auth users (created via Supabase admin API, not SQL)
    ├── 02_clients.sql
    ├── 03_quotations.sql
    ├── 04_bookings.sql
    ├── 05_invoices_payments.sql
    ├── 06_expenses.sql
    ├── 07_staff.sql
    ├── 08_portfolio.sql
    ├── 09_reviews.sql
    ├── 10_delivery_stages.sql
    └── seed.ts               — Orchestrator script (TypeScript)
```

### 4.2 Orchestrator Script

```typescript
// supabase/seed/seed.ts
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const DEMO_SUPABASE_URL = process.env.DEMO_SUPABASE_URL!
const DEMO_SUPABASE_SERVICE_KEY = process.env.DEMO_SUPABASE_SERVICE_KEY!

if (!DEMO_SUPABASE_URL || !DEMO_SUPABASE_SERVICE_KEY) {
  throw new Error('Demo Supabase credentials must be set in environment. Never use production credentials.')
}

// Safety check: refuse to run against production URL
const PRODUCTION_URL_FRAGMENT = 'vows-prod'
if (DEMO_SUPABASE_URL.includes(PRODUCTION_URL_FRAGMENT)) {
  throw new Error('SAFETY ABORT: This script cannot be run against the production Supabase project.')
}

const supabase = createClient(DEMO_SUPABASE_URL, DEMO_SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runSeed() {
  console.log('🌱 Seeding demo database:', DEMO_SUPABASE_URL)
  
  // 1. Clear existing demo data (idempotent)
  await clearDemoData()
  
  // 2. Run SQL seed files in order
  const sqlFiles = [
    '00_business_settings.sql',
    '02_clients.sql',
    '03_quotations.sql',
    '04_bookings.sql',
    '05_invoices_payments.sql',
    '06_expenses.sql',
    '07_staff.sql',
    '08_portfolio.sql',
    '09_reviews.sql',
    '10_delivery_stages.sql',
  ]
  
  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8')
    const { error } = await supabase.rpc('psql / Supabase CLI seed (auth users created first)', { sql })  // Or use Supabase CLI
    if (error) throw new Error(`Seed failed on ${file}: ${error.message}`)
    console.log(`  ✓ ${file}`)
  }
  
  // 3. Create auth users (must use admin API)
  await createDemoAuthUsers()
  
  // 4. Upload demo portfolio images
  await uploadDemoPortfolioImages()
  
  console.log('✅ Demo seed complete.')
}

async function clearDemoData() {
  // Delete in reverse dependency order
  const tables = ['delivery_stages', 'reviews', 'portfolio_items', 'expenses',
                   'payments', 'invoices', 'bookings', 'quotations', 'clients',
                   'staff', 'business_settings']
  for (const table of tables) {
    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
}
```

### 4.3 Running the Seed

```bash
# Set demo credentials only
export DEMO_SUPABASE_URL="https://yyyy.supabase.co"
export DEMO_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run the seed (never point at production)
npx tsx supabase/seed/seed.ts
```

### 4.4 Idempotency

The seed script **always clears existing data before inserting** (`clearDemoData()`). This means it is safe to re-run at any time to reset the demo to its baseline state. All UUIDs are hardcoded in the SQL files (not generated at runtime) — this ensures referential integrity across tables and predictable login credentials.

> [!WARNING]
> The seed script includes a **safety abort check** that refuses to run if the target URL contains the production project identifier. This is a defence-in-depth measure, not a substitute for careful secret management.

---

## 5. Demo Login Accounts

The following accounts are pre-created in the demo Supabase project. All passwords follow the pattern for easy demonstration. MFA is **bypassed** in demo mode (`IS_DEMO` check in middleware skips the MFA enforcement).

| Role | Email | Password | Access Level |
|---|---|---|---|
| System Admin | admin@demo.vows.app | Demo@Admin1 | Full system access including user management |
| Business Owner | owner@demo.vows.app | Demo@Owner1 | All business operations, financial reports |
| Manager | manager@demo.vows.app | Demo@Manager1 | Bookings, clients, quotations, delivery |
| Accountant | accounts@demo.vows.app | Demo@Accounts1 | Invoices, payments, expenses, financial reports |
| Staff | staff@demo.vows.app | Demo@Staff1 | Assigned bookings, delivery stages |
| Crew | crew@demo.vows.app | Demo@Crew1 | View-only: assigned events and schedules |

**Login page note:** In demo mode, the login page shows a **"Demo Accounts"** expandable panel listing all role credentials — so portfolio viewers can explore different roles without needing to contact the developer.

```tsx
// components/auth/DemoAccountsPanel.tsx
{IS_DEMO && (
  <details className="mt-4 border rounded-lg p-4 bg-amber-50">
    <summary className="font-medium cursor-pointer">🎭 Demo Accounts — Click to expand</summary>
    <table className="mt-3 text-sm w-full">
      {/* ... demo credentials table ... */}
    </table>
  </details>
)}
```

---

## 6. What Must NEVER Be in Demo

> [!CAUTION]
> This section defines **hard rules**. Violations must be treated as security/privacy incidents and corrected immediately.

### Forbidden Data

- ❌ Any **real VOWS Studio client name**, phone number, email address, or physical address
- ❌ Any **real invoice amounts**, quotation figures, or financial data belonging to real VOWS clients
- ❌ Any **real booking information** including event dates, venues, or client details
- ❌ Any **real VOWS Studio photographs** — all images must be from licensed stock sources
- ❌ Any **real VOWS staff personal information** (names, phones, NI numbers, etc.)
- ❌ Any **real VOWS bank account details** or GST registration numbers

### Forbidden Credentials

- ❌ **Production Supabase URL** or keys in any demo environment file, script, or deploy
- ❌ **Production Google OAuth** `client_id` or `client_secret` in demo `.env`
- ❌ **Any real Gmail refresh tokens** in the demo database
- ❌ **Any API key or secret** from the production environment

### Forbidden Git History

- ❌ The demo repository **must not contain git history** from the production repository
- ❌ **Never** run `git push` from the production repo to the demo repo
- ❌ If a production secret is accidentally committed to the demo repo, **rotate the secret immediately**, then use `git filter-repo` to purge it from history before the next push

### Verification Checklist (Before Publishing Demo URL)

```
□ All client names checked — none are real people
□ All phone numbers checked — use demo range (+91 98400 001XX)
□ All email addresses use @demo.email domain
□ All GSTIN/PAN values are clearly fake (contain 'DEMO')
□ All bank details show XXXX-DEMO placeholder
□ All portfolio images have license records in portfolio-image-sources.csv
□ No VOWS Studio photographs in storage
□ Supabase URL in .env.local matches demo project (not production)
□ NEXT_PUBLIC_APP_MODE=demo is set in Vercel project
□ Gmail send tested — shows "Email Sent (Demo)" toast, no real email
□ PDF generated — shows Lumina Studio branding + DEMO watermark
```

---

## 7. Deployment Checklist

Follow these steps in order every time the demo environment is created or recreated from scratch.

### Step 1 — Create New Supabase Project

```
1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Project name: vows-studio-demo
4. Database password: [generate strong password, store in password manager]
5. Region: ap-south-1 (Mumbai — closest to Karnataka)
6. Plan: Free (demo does not need production plan)
7. Note the Project URL and anon/service role keys
```

### Step 2 — Run Migrations Against Demo Project

```bash
# Link Supabase CLI to demo project (not production)
supabase link --project-ref <demo-project-ref>

# Confirm you are linked to the demo project
supabase status

# Run all migrations
supabase db push
```

Verify: check the Supabase dashboard — all tables should exist with correct schema.

### Step 3 — Run Seed Script

```bash
export DEMO_SUPABASE_URL="https://<demo-ref>.supabase.co"
export DEMO_SUPABASE_SERVICE_KEY="<demo-service-role-key>"
npx tsx supabase/seed/seed.ts
```

Verify: check each table in Supabase Studio — data should be present.

### Step 4 — Create New Vercel Project

```
1. Go to https://vercel.com/dashboard
2. Click "Add New... → Project"
3. Import from GitHub: vows-studio-demo repository
4. Project name: vows-studio-demo
5. Framework preset: Next.js (auto-detected)
6. Root directory: ./ (default)
```

### Step 5 — Set Demo Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, set for **all environments** (Production / Preview / Development):

```
NEXT_PUBLIC_SUPABASE_URL          = https://<demo-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = <demo-anon-key>
SUPABASE_SERVICE_ROLE_KEY         = <demo-service-role-key>
NEXT_PUBLIC_APP_MODE              = demo
NEXT_PUBLIC_APP_URL               = https://demo.vows.studio
GOOGLE_TOKEN_ENCRYPTION_KEY                = <demo-only-random-key>

# Google OAuth: either omit entirely (Gmail connect disabled in demo) or
# use a separate demo Google Cloud project
GOOGLE_CLIENT_ID                  = <demo-google-client-id or omit>
GOOGLE_CLIENT_SECRET              = <demo-google-client-secret or omit>
```

> [!IMPORTANT]
> Do **not** copy environment variables from the production Vercel project. Manually set each one using demo values only.

### Step 6 — Deploy

```
In Vercel: Deployments → Trigger Deployment → main branch
```

Or push a commit to trigger automatic deployment.

### Step 7 — Verify All Real Integrations Are Disabled

After the first successful deployment, verify:

```
□ Open /settings/integrations
  → Gmail shows "Not Connected" and "Connect Gmail" button is visible
  → Clicking "Send Email" on a quotation shows "Email Sent (Demo)" toast
  → No real email arrives in any inbox

□ Open a quotation, click "Generate PDF"
  → PDF generates with "Lumina Studio" branding
  → PDF has "DEMO — NOT A REAL DOCUMENT" watermark
  → Business address shows Lumina Studio, not VOWS

□ Demo mode banner is visible at top of all pages
□ Demo accounts panel visible on login page
```

### Step 8 — Test All Demo Accounts

For each account:

```
□ admin@demo.vows.app — Can create users, access all settings
□ owner@demo.vows.app — Can see all reports, edit business settings
□ manager@demo.vows.app — Can manage bookings, cannot access financial settings
□ accounts@demo.vows.app — Can manage invoices, cannot create staff
□ staff@demo.vows.app — Can see assigned bookings, cannot see all clients
□ crew@demo.vows.app — Can only see assigned events
```

### Step 9 — Confirm No Production Data Accessible

```bash
# From local machine, using demo anon key — should return Lumina Studio data only
curl "https://<demo-ref>.supabase.co/rest/v1/business_settings" \
  -H "apikey: <demo-anon-key>" \
  -H "Authorization: Bearer <demo-anon-key>"

# Expected: Lumina Studio row
# FAIL if: any VOWS Studio data appears
```

### Step 10 — Configure Custom Domain (Optional)

```
Vercel → Project → Settings → Domains
Add: demo.vows.studio
Configure DNS CNAME at your domain registrar
```

---

## 8. Maintenance

### 8.1 Keeping Demo Schema in Sync with Production

The demo and production environments share the **same codebase and migrations**. When a new migration is created for production:

```bash
# 1. Test migration on dev/local first
supabase db reset

# 2. Apply to demo project
supabase link --project-ref <demo-project-ref>
supabase db push

# 3. Re-run seed if the migration adds new tables or changes seed-dependent columns
npx tsx supabase/seed/seed.ts

# 4. Verify demo app still works after migration
# ... run through deployment checklist Step 7-9

# 5. Only then apply to production
supabase link --project-ref <production-ref>
supabase db push
```

> [!WARNING]
> **Never** run a production migration against the demo environment and production environment simultaneously without testing. The demo environment serves as a staging validation step.

### 8.2 Resetting Demo Data

The demo environment may accumulate test data created by portfolio viewers (e.g., someone creates a test client record). Periodically reset:

```bash
# Monthly reset (or on demand)
export DEMO_SUPABASE_URL="https://<demo-ref>.supabase.co"
export DEMO_SUPABASE_SERVICE_KEY="<demo-service-role-key>"
npx tsx supabase/seed/seed.ts

# This clears and re-seeds all data, restoring baseline
```

Consider setting up a **scheduled Vercel Cron** to auto-reset the demo weekly:

```typescript
// app/api/cron/reset-demo/route.ts
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!IS_DEMO) return new Response('Not demo mode', { status: 403 })
  
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  await runDemoSeed()  // Programmatic version of the seed script
  return new Response('Demo reset complete', { status: 200 })
}
```

```json
// vercel.json (demo project only)
{
  "crons": [
    {
      "path": "/api/cron/reset-demo",
      "schedule": "0 2 * * 0"  // Every Sunday at 2:00 AM UTC
    }
  ]
}
```

### 8.3 Updating Demo Portfolio Images

If portfolio images need updating (e.g., better stock images found):

1. Download new images from Unsplash/Pexels
2. Update `supabase/seed/portfolio-image-sources.csv` with new source URLs and license info
3. Replace image files in `supabase/seed/images/`
4. Re-run the seed script

### 8.4 Version Compatibility Warning

> [!WARNING]
> If the production codebase adds a **new required environment variable**, the demo deployment will fail or behave unexpectedly until the same variable (with a demo-appropriate value) is added to the demo Vercel project. Add a note in every PR description that adds new env vars: *"Demo env var update required: `VAR_NAME=demo-value`"*

---

## Appendix: Demo Repository `.env.example`

```bash
# VOWS Studio Demo Environment
# Copy this file to .env.local and fill in DEMO values ONLY

# Supabase — MUST be demo project credentials
NEXT_PUBLIC_SUPABASE_URL=https://DEMO_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=DEMO_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=DEMO_SERVICE_ROLE_KEY_HERE

# App Mode — MUST be demo for portfolio deployment
NEXT_PUBLIC_APP_MODE=demo
NEXT_PUBLIC_APP_URL=https://demo.vows.studio

# Google OAuth — use demo Google Cloud project or leave blank to disable Gmail connect
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption key for demo token storage (random, demo-only)
GOOGLE_TOKEN_ENCRYPTION_KEY=GENERATE_A_RANDOM_32_CHAR_STRING_HERE

# Cron secret for demo reset endpoint
CRON_SECRET=GENERATE_A_RANDOM_SECRET_HERE

# NEVER PUT PRODUCTION CREDENTIALS IN THIS FILE
# NEVER COPY .env FROM THE PRODUCTION REPOSITORY
```

---

*Document version: 1.0 | Last updated: 2026-11-09 | Author: Architecture Team*
