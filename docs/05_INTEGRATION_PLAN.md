# VOWS Studio — Integration Architecture Plan

> [!IMPORTANT]
> This document is the canonical reference for all external service integrations in VOWS Studio. All engineers must follow the patterns described here. Never bypass the strategies documented in the Security sections.

---

## Table of Contents

1. [Supabase Integration](#1-supabase-integration)
2. [Gmail Integration (Google OAuth + Gmail API)](#2-gmail-integration-google-oauth--gmail-api)
3. [PDF Generation Integration](#3-pdf-generation-integration)
4. [Vercel Deployment Integration](#4-vercel-deployment-integration)
5. [Future Integrations (Planned, Not MVP)](#5-future-integrations-planned-not-mvp)

---

## 1. Supabase Integration

### 1.1 Authentication

#### Setup: Email/Password Only

VOWS Studio uses **email/password authentication exclusively** for the CRM. Magic links are explicitly disabled — the business does not have a self-registration flow for clients; all accounts are provisioned by a System Admin.

```
Auth Providers Enabled: Email/Password
Magic Links: DISABLED
Phone OTP: DISABLED
OAuth Providers: DISABLED (for CRM users)
```

Configure in `supabase/config.toml`:

```toml
[auth]
site_url = "https://vows.studio"
additional_redirect_urls = []
jwt_expiry = 3600

[auth.email]
enable_signup = false         # Admins create accounts manually
double_confirm_changes = true
enable_confirmations = true

[auth.external.google]
enabled = false               # Google OAuth only used for Gmail API — not user auth
```

#### MFA (TOTP) Configuration

MFA via TOTP (Time-based One-Time Password, e.g., Google Authenticator) is **required for System Admin and Business Owner** roles, and **optional for other roles**.

Enforcement is handled at the middleware level:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const role = user.user_metadata?.role
    const aal = user.user_metadata?.aal ?? 'aal1'
    const mfaRequiredRoles = ['sysadmin', 'business_owner']

    if (mfaRequiredRoles.includes(role) && aal !== 'aal2') {
      // Redirect to MFA challenge page
      return NextResponse.redirect(new URL('/auth/mfa', request.url))
    }
  }
}
```

After TOTP verification, Supabase upgrades the session to `aal2`. The middleware checks `aal` on every protected route.

#### Custom Claims / Role Metadata

User roles are stored in `user_metadata` at account creation time (set by System Admin using service role key):

```typescript
// Server Action — only called by SysAdmin
await supabaseAdmin.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'manager',          // 'sysadmin' | 'business_owner' | 'manager' | 'accountant' | 'staff' | 'crew'
    full_name: 'Ravi Kumar',
    avatar_url: null,
  }
})
```

> [!NOTE]
> `user_metadata` is readable client-side. `app_metadata` is server-only and cannot be modified by the user. For roles, use `app_metadata.role` via service role, then surface it via a secure Server Action — do not rely solely on `user_metadata` for security-critical role checks.

RLS policies reference `auth.jwt() ->> 'app_metadata' ->> 'role'` for server-enforced access control.

#### Middleware Integration with Next.js App Router

The Supabase session is refreshed on every request via middleware. The pattern uses `@supabase/ssr`:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Call getUser() to refresh the session token
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

#### Server-side vs Client-side Supabase Client

| Context | Client to Use | Purpose |
|---|---|---|
| Server Components (RSC) | `createServerClient` (from `@supabase/ssr`) with cookies | Fetching data for rendering |
| Server Actions | `createServerClient` (service role for admin ops) | Mutations with RLS bypass where authorised |
| Route Handlers | `createServerClient` | API-style endpoints |
| Client Components | `createBrowserClient` (from `@supabase/ssr`) | Realtime subscriptions, auth state |
| Middleware | `createServerClient` | Session refresh, auth gating |

> [!CAUTION]
> **Never** use the service role key in a Client Component or expose it to the browser. The service role key bypasses all RLS policies.

#### Cookie-based Session Strategy

Supabase sessions are managed via HTTP-only cookies (set by `@supabase/ssr`). No `localStorage` is used for session tokens. The middleware refreshes the session on every request by calling `supabase.auth.getUser()`, which automatically rotates the token if near expiry and sets updated cookies in the response.

Cookie settings:
- `HttpOnly: true`
- `Secure: true` (production)
- `SameSite: Lax`
- `Path: /`

#### RLS and Service Role Key Usage

The **anon key** is used for all client-side and standard server-side operations — RLS policies enforce access.

The **service role key** is used **only** in Server Actions for:
- System Admin operations (creating/deleting users)
- Background operations (PDF generation, sending emails, seeding)
- Database triggers and migrations via CLI

RLS must be **enabled on every table**. The service role bypasses RLS — only use it in controlled, authenticated server paths.

---

### 1.2 Database

#### Supabase PostgreSQL from Next.js

All database access goes through the Supabase client (PostgREST / `supabase-js`). Direct PostgreSQL connections (via `pg` or Prisma) are **not used** — this avoids connection pooling issues on serverless.

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

#### Server Actions Using Service Role

Server Actions that require bypassing RLS (e.g., SysAdmin user management) use the admin client:

```typescript
// app/actions/admin/users.ts
'use server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function createUser(data: CreateUserInput) {
  await requireRole('sysadmin')  // Throws if not authorised
  const supabase = createSupabaseAdminClient()
  // ... admin operations
}
```

#### Migration Management with Supabase CLI

Migrations live in `supabase/migrations/`. The Supabase CLI manages versioning.

```bash
# Create a new migration
supabase migration new add_expense_categories

# Apply to local dev
supabase db reset

# Apply to remote (production)
supabase db push --linked
```

> [!WARNING]
> Never edit existing migration files. Always create new incremental migrations. Run migrations against the **demo/dev** Supabase project first and confirm before applying to production.

#### Database Functions and Trigger Integration

Complex business logic implemented as PostgreSQL functions:

- `calculate_invoice_balance()` — triggered after payment insert/update
- `update_booking_status()` — triggered after stage update
- `generate_quotation_number()` — returns next sequential number per year
- `audit_log_insert()` — generic trigger logging changes to `audit_log` table

Functions are defined in `supabase/migrations/` as SQL files and versioned with the CLI.

---

### 1.3 Storage

#### Bucket Architecture

| Bucket | Access | Contents |
|---|---|---|
| `portfolio` | **Public read**, authenticated write | Gallery images for the studio's public portfolio |
| `documents` | **Private** | Generated PDFs: quotations, invoices, receipts |
| `client-uploads` | **Private** | Files sent by clients (reference images, etc.) |
| `brand-assets` | **Private** | Logo, watermark, signature images for PDF branding |
| `expense-receipts` | **Private** | Receipt images attached to expense records |

#### RLS on Each Bucket

```sql
-- portfolio: public read, authenticated write
CREATE POLICY "Public can view portfolio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

-- documents: only authenticated users who own the resource
CREATE POLICY "Users access own documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    -- Further scoping via path: documents/{booking_id}/{filename}
  );
```

> [!NOTE]
> Private buckets use **path-based access control**: file paths encode the resource ID (e.g., `documents/{booking_id}/{file}.pdf`). RLS policies validate that the requesting user has access to that `booking_id` via a cross-table check on `bookings`.

#### Signed URL Generation for Private Files

Private file access always goes through a Server Action or Route Handler that generates a time-limited signed URL:

```typescript
// app/actions/storage/getSignedUrl.ts
'use server'
export async function getDocumentSignedUrl(path: string): Promise<string> {
  await requireAuthenticated()
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600)  // 1 hour expiry
  if (error) throw new Error('Could not generate download URL')
  return data.signedUrl
}
```

Signed URLs are **never** stored in the database — they are generated on-demand and expire.

#### File Naming Conventions

```
documents/{booking_id}/quotation-{quotation_number}-v{version}.pdf
documents/{booking_id}/invoice-{invoice_number}.pdf
documents/{booking_id}/receipt-{payment_id}.pdf
brand-assets/{business_id}/logo.{ext}
brand-assets/{business_id}/signature-{user_id}.{ext}
expense-receipts/{expense_id}/{uuid}.{ext}
client-uploads/{booking_id}/{uuid}-{original_name}
portfolio/{category_slug}/{uuid}.{ext}
```

UUIDs prevent path guessing. Original filenames are stored in the database record, not in the storage path.

#### Size Limits and MIME Types

| Bucket | Max Size | Allowed MIME Types |
|---|---|---|
| `portfolio` | 20 MB | `image/jpeg`, `image/png`, `image/webp` |
| `documents` | 10 MB | `application/pdf` |
| `client-uploads` | 50 MB | `image/*`, `application/pdf`, `video/mp4` |
| `brand-assets` | 5 MB | `image/jpeg`, `image/png`, `image/svg+xml` |
| `expense-receipts` | 10 MB | `image/jpeg`, `image/png`, `application/pdf` |

Configured in Supabase Dashboard → Storage → Bucket Settings.

---

### 1.4 Realtime

#### Dashboard Live Updates

Realtime subscriptions power the dashboard's live metrics. Subscriptions are set up in Client Components using `useEffect`:

```typescript
// components/dashboard/LiveBookingCounter.tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export function LiveBookingCounter() {
  const [count, setCount] = useState(0)
  const supabase = createBrowserClient(...)

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-bookings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
      }, (payload) => {
        // Refetch count or optimistically update
        fetchBookingCount().then(setCount)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}
```

#### Tables to Subscribe To

| Table | Events | Use Case |
|---|---|---|
| `bookings` | `INSERT`, `UPDATE` | Live booking count, status changes |
| `payments` | `INSERT` | Payment notification badge |
| `delivery_stages` | `UPDATE` | Delivery pipeline progress |
| `enquiries` | `INSERT` | New enquiry notification |

> [!TIP]
> Realtime subscriptions should only be active on the **dashboard page** and relevant detail pages — do not subscribe globally. Unsubscribe (`removeChannel`) in the component cleanup to avoid memory leaks and stale connections.

---

## 2. Gmail Integration (Google OAuth + Gmail API)

### 2.1 OAuth Setup

#### Google Cloud Console Project Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project: **VOWS Studio CRM**
3. Enable the **Gmail API** under APIs & Services → Library
4. Configure the **OAuth Consent Screen**:
   - App name: `VOWS Studio`
   - User type: **Internal** (only your Google Workspace / personal account)
   - Scopes: `https://www.googleapis.com/auth/gmail.send`
5. Create **OAuth 2.0 Client ID** (Application type: **Web application**)
6. Add Authorised Redirect URIs:
   - `http://localhost:3000/api/auth/gmail/callback` (development)
   - `https://vows.studio/api/auth/gmail/callback` (production)

#### Required Scopes

```
https://www.googleapis.com/auth/gmail.send
```

**Only request `gmail.send`** — do not request read permissions. This is the minimum viable scope and reduces the OAuth consent screen's trust requirements.

#### Authorisation Flow (Server-Side)

This is a **server-to-server OAuth flow** — the Business Owner authorises once; subsequent sends use the stored refresh token automatically:

```
1. Business Owner clicks "Connect Gmail" in Settings
2. Server Action generates Google OAuth URL with state parameter (CSRF token stored in session)
3. User redirected to Google consent screen
4. Google redirects to /api/auth/gmail/callback with `code` and `state`
5. Route Handler validates `state`, exchanges `code` for tokens (server-side, never client)
6. `access_token` and `refresh_token` stored encrypted in Supabase Vault
7. User redirected back to Settings with success confirmation
```

```typescript
// app/api/auth/gmail/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // 1. Validate CSRF state
  await validateOAuthState(state)

  // 2. Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code!)

  // 3. Store encrypted in Supabase Vault
  await storeGmailTokens({
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  })

  return NextResponse.redirect('/settings/integrations?gmail=connected')
}
```

#### Storing Tokens in Supabase (Encrypted)

Tokens are stored in a `gmail_credentials` table using **Supabase Vault** (`vault.create_secret`) or `pgcrypto` encryption:

```sql
-- Using pgcrypto (simpler, available by default)
CREATE TABLE gmail_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_settings(id) ON DELETE CASCADE,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  expiry_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: only service role can read/write
ALTER TABLE gmail_credentials ENABLE ROW LEVEL SECURITY;
-- No SELECT policy for authenticated users — accessed only server-side via admin client
```

Encryption/decryption using `pgcrypto` or Supabase Vault — the symmetric key is stored as an environment variable, **never in the database**.

#### Token Refresh Logic

Refresh is handled server-side before every Gmail API call:

```typescript
// lib/gmail/client.ts
export async function getGmailClient() {
  const credentials = await fetchDecryptedCredentials()
  
  if (isExpired(credentials.expiry_date)) {
    const newTokens = await refreshAccessToken(credentials.refresh_token)
    await updateStoredTokens(newTokens)
    return buildGmailClient(newTokens.access_token)
  }
  
  return buildGmailClient(credentials.access_token)
}
```

#### Revocation and Re-authorisation

The Settings page provides a **"Disconnect Gmail"** button that:
1. Calls Google's token revocation endpoint (`https://oauth2.googleapis.com/revoke`)
2. Deletes the row from `gmail_credentials`
3. The "Connect Gmail" button becomes available again

---

### 2.2 Sending Emails

#### Server Action — Never Client-Side

All Gmail API calls happen exclusively in Server Actions:

```typescript
// app/actions/email/sendQuotationEmail.ts
'use server'
import { requireRole } from '@/lib/auth/requireRole'
import { getGmailClient } from '@/lib/gmail/client'
import { generateEmailMessage } from '@/lib/gmail/message'

export async function sendQuotationEmail(quotationId: string) {
  await requireRole(['sysadmin', 'business_owner', 'manager'])

  const gmail = await getGmailClient()
  const quotation = await fetchQuotationWithClient(quotationId)
  
  // Validate recipient
  if (!isValidEmail(quotation.client.email)) {
    throw new Error('Invalid recipient email address')
  }

  // Fetch PDF bytes from Supabase Storage
  const pdfBytes = await fetchPdfFromStorage(quotation.pdf_path)

  // Build MIME message
  const message = generateEmailMessage({
    to: quotation.client.email,
    subject: `Quotation ${quotation.quotation_number} from VOWS Studio`,
    htmlBody: renderQuotationEmailTemplate(quotation),
    plainText: renderQuotationEmailPlain(quotation),
    attachment: { filename: `${quotation.quotation_number}.pdf`, bytes: pdfBytes },
  })

  // Send
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: message },
  })

  // Log the event
  await logEmailSent({ quotationId, recipientEmail: quotation.client.email })
}
```

#### Attaching PDFs from Supabase Storage

```typescript
async function fetchPdfFromStorage(path: string): Promise<Buffer> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage.from('documents').download(path)
  if (error || !data) throw new Error('PDF not found in storage')
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

The PDF bytes are base64-encoded and embedded as a MIME `multipart/mixed` attachment in the outgoing Gmail message.

#### Email Template Structure

```
Multipart/Mixed
├── Multipart/Alternative
│   ├── text/plain — fallback for non-HTML clients
│   └── text/html  — branded HTML email with VOWS logo
└── application/pdf — attached PDF document
```

HTML templates are stored in `lib/gmail/templates/` as React components rendered to HTML strings using `renderToStaticMarkup`.

#### Logging Send Events

Every successful or failed email send is logged to the activity table:

```sql
-- quotation_activities / invoice_activities
INSERT INTO quotation_activities (quotation_id, action, metadata, performed_by)
VALUES (
  $1,
  'email_sent',
  jsonb_build_object('recipient', $2, 'subject', $3, 'sent_at', now()),
  auth.uid()
);
```

Failed sends are logged with `action = 'email_failed'` and the error message in `metadata`.

#### Error Handling and Retry Strategy

```typescript
async function sendWithRetry(gmail, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await gmail.users.messages.send({ userId: 'me', requestBody: { raw: message } })
    } catch (error) {
      if (error.code === 429 || error.code >= 500) {
        // Transient: wait and retry with exponential backoff
        await sleep(1000 * Math.pow(2, attempt))
        continue
      }
      // Non-retryable (400, 401, 403): throw immediately
      throw error
    }
  }
  throw new Error('Gmail send failed after maximum retries')
}
```

#### Rate Limiting (Gmail API Quotas)

Gmail API limits: **250 quota units/second** per user, **1,000,000,000 units/day** per project. Sending one email costs ~100 units. VOWS Studio's volume is well within limits. No additional rate limiting is required at MVP.

Log the quota usage if approaching limits in a future monitoring phase.

---

### 2.3 Fallback Strategy

If Gmail is not connected or the token is expired/revoked:

1. The send button is **replaced** with a **"Download PDF"** button
2. The UI shows a banner: *"Gmail not connected. Download the PDF to send manually."*
3. The user is linked to Settings → Integrations to reconnect
4. **Never silently suppress** an error — always surface the status

```typescript
export async function getGmailStatus(): Promise<'connected' | 'expired' | 'disconnected'> {
  const credentials = await fetchCredentialsMeta()
  if (!credentials) return 'disconnected'
  if (isExpired(credentials.expiry_date) && !credentials.refresh_token) return 'expired'
  return 'connected'
}
```

---

### 2.4 Security

| Concern | Mitigation |
|---|---|
| Tokens exposed to client | All token access is in Server Actions / Route Handlers only |
| Tokens at rest | Encrypted with `pgcrypto` using an env-var key; plaintext never stored |
| Excessive OAuth scope | Only `gmail.send` requested — no read/delete/modify permissions |
| Token rotation | Access token refreshed before each use; refresh token updated on rotation |
| CSRF on OAuth callback | `state` parameter validated against session-stored value |
| Credential leakage in logs | Tokens never logged; only email address and timestamp logged |

---

## 3. PDF Generation Integration

### 3.1 Strategy

**Library**: `@react-pdf/renderer`
**Runtime**: Node.js (not Edge Runtime — `@react-pdf/renderer` requires Node.js APIs)

PDF generation is entirely **server-side**. The generated PDF is stored in Supabase Storage; a signed URL is returned to the client for preview or download.

### 3.2 Generation Flow

```
Client Action (e.g., "Generate PDF")
         │
         ▼
   Server Action: generateQuotationPdf(quotationId)
         │
         ├── 1. Fetch quotation data (all line items, client, business settings)
         ├── 2. Fetch brand assets from Supabase Storage (logo, signature) → base64
         ├── 3. Render PDF using @react-pdf/renderer → Buffer
         ├── 4. Upload Buffer to Supabase Storage (documents/{booking_id}/...)
         ├── 5. Update quotation record with pdf_path and pdf_generated_at
         └── 6. Return signed URL (1 hour) to client
```

### 3.3 API Route (Node.js Runtime)

PDF generation runs in a Route Handler with explicit Node.js runtime declaration:

```typescript
// app/api/pdf/generate/route.ts
export const runtime = 'nodejs'   // Required — not 'edge'
export const maxDuration = 30     // Allow up to 30s for complex PDFs

import { renderToBuffer } from '@react-pdf/renderer'

export async function POST(request: Request) {
  const { type, id } = await request.json()
  // ... fetch data, render, upload, return signed URL
}
```

### 3.4 Template System

Templates are React components in `lib/pdf/templates/`:

```
lib/pdf/templates/
├── QuotationTemplate.tsx   — Quotation PDF layout
├── InvoiceTemplate.tsx     — Invoice PDF layout
├── ReceiptTemplate.tsx     — Payment receipt layout
└── components/
    ├── PdfHeader.tsx       — Logo + business info header
    ├── PdfFooter.tsx       — Page number + terms footer
    ├── LineItemsTable.tsx  — Service line items table
    └── SignatureBlock.tsx  — Signature image + name
```

Templates accept a typed `data` prop and a `branding` prop:

```typescript
interface BrandingProps {
  logoBase64: string        // Data URL for the logo image
  primaryColor: string      // e.g., '#1a3c5e'
  businessName: string
  address: string
  phone: string
  email: string
  signatureBase64?: string  // Optional authorised signatory
}
```

### 3.5 Dynamic Branding

At generation time, the Server Action:

1. Reads `business_settings` row from the database (name, address, phone, email, brand colours)
2. Downloads logo and signature from `brand-assets` bucket → converts to base64 data URLs
3. Passes `BrandingProps` to the PDF template

This ensures every generated PDF reflects the latest business settings without cache staleness.

### 3.6 Font Embedding

Custom fonts are embedded using `@react-pdf/renderer`'s `Font.register()`:

```typescript
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Poppins',
  fonts: [
    { src: '/fonts/Poppins-Regular.ttf' },
    { src: '/fonts/Poppins-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Poppins-Italic.ttf', fontStyle: 'italic' },
  ],
})
```

Fonts are stored in `public/fonts/` and loaded at build time. **Noto Sans** is included for Indian language support (optional).

### 3.7 Page Size and Layout

- Page size: **A4** (210mm × 297mm)
- Margins: 20mm all sides
- Colour scheme: driven by `business_settings.brand_primary_color`

### 3.8 Error Handling

If PDF generation fails:

1. The error is caught in the Server Action
2. Logged to `generation_errors` table with `type`, `resource_id`, `error_message`, `stack_trace`
3. The UI shows: *"PDF generation failed. Please try again or contact support."*
4. The quotation/invoice record is **not** updated with a stale `pdf_path`

### 3.9 Caching Strategy

PDFs are **regenerated** when:
- The quotation/invoice data changes (line items, amounts, client details)
- The business settings or branding changes
- The user manually triggers regeneration

The `pdf_generated_at` timestamp on the record is compared to `updated_at`. If `updated_at > pdf_generated_at`, the UI shows a warning: *"The PDF may be outdated. Regenerate before sending."*

Old PDF files in storage are **overwritten** (same path, new upload replaces old) — no versioning for invoices. For quotations, version suffix is appended: `quotation-Q2024-001-v2.pdf`.

---

## 4. Vercel Deployment Integration

### 4.1 Project Structure

Single Next.js 14+ (App Router) project deployed to Vercel. No monorepo setup required at MVP.

```
vows-studio/
├── app/                    # Next.js App Router
├── components/             # Shared UI components
├── lib/                    # Utilities, Supabase clients, Gmail client
├── supabase/               # Supabase CLI config, migrations, seed
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
├── public/                 # Static assets, fonts
├── .env.local              # Local dev environment (never committed)
├── .env.example            # Template — committed to repo
├── next.config.ts
└── vercel.json             # Build/deployment config
```

### 4.2 Environment Variables

#### Required Variables

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client + server) | Supabase anon key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Bypasses RLS — never expose |
| `GOOGLE_CLIENT_ID` | Server-only | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server-only | Google OAuth client secret |
| `SUPABASE_JWT_SECRET` | Server-only | For manual JWT verification |
| `PDF_ENCRYPTION_KEY` | Server-only | Key for encrypting Gmail tokens |
| `NEXT_PUBLIC_APP_URL` | Public | Base URL of the deployment |
| `NEXT_PUBLIC_APP_MODE` | Public | `production` or `demo` |

> [!CAUTION]
> Any variable without the `NEXT_PUBLIC_` prefix is **server-only** in Next.js and is never bundled into the client. Keep `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, and `PDF_ENCRYPTION_KEY` as server-only.

Set all variables in Vercel Dashboard → Project Settings → Environment Variables, scoped to Production / Preview / Development as appropriate.

### 4.3 Preview Deployments

- Preview deployments use a **separate `dev` Supabase project**
- Vercel environment variables for `Preview` scope point to `dev` Supabase credentials
- Preview Gmail OAuth uses a separate Google Cloud project (or the same one with an additional redirect URI for Vercel preview URLs)
- Preview URL pattern: `vows-studio-git-{branch}-{org}.vercel.app`

### 4.4 Build Configuration

```json
// vercel.json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/pdf/**": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

PDF generation route gets increased memory allocation to handle large PDF renders.

### 4.5 GitHub Integration and Branch Strategy

```
main          — Production (protected branch, requires PR + review)
  └── dev     — Development (auto-deploys to Vercel preview with dev env)
        └── feature/* — Feature branches (PR → dev)
```

**Branch protection rules (GitHub):**
- `main`: Require 1 approving review, require status checks (Vercel build) to pass
- `dev`: Require status checks to pass

**Vercel GitHub Integration:**
- Push to `main` → Production deployment
- Push to `dev` or any branch → Preview deployment
- PR comment shows preview URL automatically

---

## 5. Future Integrations (Planned, Not MVP)

The architecture is designed to accommodate these integrations without major refactoring.

### 5.1 WhatsApp Business API

**Integration point:** Server Action triggered after booking confirmation or when a quotation is sent.

**Architecture support:**
- A `notifications` table records pending/sent notifications with channel (`email`, `whatsapp`, `sms`)
- The WhatsApp sending logic lives in `lib/whatsapp/client.ts` — a thin wrapper around the Meta WhatsApp Business API
- Templates (pre-approved message templates) are stored in `whatsapp_templates` table
- An environment variable `WHATSAPP_API_TOKEN` is added to Vercel when this feature is enabled

### 5.2 SMS Notifications (Twilio or MSG91)

**Integration point:** Optional SMS for booking reminders, payment receipts.

**Architecture support:**
- Same `notifications` table as WhatsApp — `channel = 'sms'`
- `lib/sms/client.ts` abstracts the provider (Twilio or MSG91 — MSG91 is preferred for India)
- Phone numbers are already stored on client records in E.164 format (`+91XXXXXXXXXX`)
- Environment variables: `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`

### 5.3 Google Calendar Sync

**Integration point:** When a booking is confirmed, sync the event date to the business's Google Calendar.

**Architecture support:**
- Uses the same Google OAuth flow as Gmail, with an additional scope: `https://www.googleapis.com/auth/calendar.events`
- The existing `gmail_credentials` table is generalised to `google_credentials` with a `scopes` column
- Calendar event IDs are stored on the `bookings` table (`google_calendar_event_id`)
- Two-way sync is out of scope at MVP; initial version is write-only (CRM → Calendar)

### 5.4 Payment Gateway (Razorpay)

**Integration point:** Online advance payment collection from clients via a shareable payment link.

**Architecture support:**
- Razorpay Order is created server-side (Server Action) when payment link is generated
- `razorpay_order_id` stored on the `payments` table
- Razorpay webhook (Route Handler at `/api/webhooks/razorpay`) verifies payment success via HMAC signature and auto-records the payment
- Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- No PCI scope changes required — Razorpay handles card data

### 5.5 Cloud Backup (Beyond Supabase Built-in)

**Integration point:** Nightly export of database and storage to an independent cloud destination.

**Architecture support:**
- Supabase provides daily automatic backups on Pro plan — this covers the MVP
- For additional resilience, a Vercel Cron Job (`/api/cron/backup`) runs nightly, dumps critical tables to JSON, and uploads to a separate AWS S3 or Google Cloud Storage bucket
- Environment variables: `BACKUP_BUCKET_URL`, `BACKUP_BUCKET_KEY`
- The backup bucket is **not** the same Supabase project — it is a fully independent store

---

*Document version: 1.0 | Last updated: 2026-11-09 | Author: Architecture Team*
