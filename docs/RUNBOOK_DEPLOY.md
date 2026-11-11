# VOWS Studio — Production Deployment Runbook
**Document Ref:** `docs/RUNBOOK_DEPLOY.md`  
**Target Environments:** Vercel Pro (Frontend & Serverless Actions), Supabase Pro (Postgres & Storage)  
**Security References:** SECURITY_PLAN §4, §6.4, §7, §12.3  

---

## 1. Cloud Architecture Overview

VOWS Studio is deployed as a zero-trust enterprise application:
- **Compute:** Vercel Edge & Serverless Runtime (Node.js 20.x, Turbopack, Next.js 16).
- **Database:** Supabase Pro PostgreSQL 15+ hosted in `ap-south-1` (Mumbai, India) for data sovereignty compliance.
- **Cache & Rate Limiting:** Upstash Serverless Redis REST API.
- **Bot Defense:** Cloudflare Turnstile invisible CAPTCHA for public enquiry and review forms.
- **Relay:** Google Workspace OAuth 2.0 via Google Cloud Project.

---

## 2. Environment Variables Reference

Configure the following variables in Vercel Project Settings > Environment Variables:

| Variable Name | Exposure | Required | Example / Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Yes | `https://[ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Yes | Supabase public anonymous key (safe for browser) |
| `NEXT_PUBLIC_APP_URL` | Client & Server | Yes | `https://vowsstudio.com` |
| `NEXT_PUBLIC_APP_MODE` | Client & Server | Yes | `production` (or `demo` for demo instance) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client & Server | Optional | Cloudflare Turnstile public site key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server ONLY | Yes | Supabase secret service-role key (NEVER expose to client) |
| `APP_MODE` | Server ONLY | Yes | `production` (or `demo`) |
| `ALLOWED_SUPABASE_PROJECT_REF` | Server ONLY | Yes | D-32 Boot Guard ref (e.g. `ap-south-1-prod-9921`) |
| `GOOGLE_CLIENT_ID` | Server ONLY | Yes | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Server ONLY | Yes | Google Cloud OAuth Client Secret |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Server ONLY | Yes | 64-character hex string (32 bytes AES-256-GCM master key) |
| `UPSTASH_REDIS_REST_URL` | Server ONLY | Optional | Upstash Redis REST URL (e.g. `https://[id].upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Server ONLY | Optional | Upstash Redis REST bearer token |
| `TURNSTILE_SECRET_KEY` | Server ONLY | Optional | Cloudflare Turnstile secret key |
| `CRON_SECRET` | Server ONLY | Yes | High-entropy random secret (32+ chars) for Vercel Cron |

### Master Encryption Key Generation
Generate `GOOGLE_TOKEN_ENCRYPTION_KEY` using OpenSSL:
```bash
openssl rand -hex 32
# Outputs 64-character hex string (256-bit entropy)
```

---

## 3. Supabase Pro Database Configuration

1. **Create Supabase Project:**
   - Region: `ap-south-1` (Mumbai, India).
   - Compute Tier: Pro (8GB RAM, 2 vCPU recommended).
2. **Apply Migrations:**
   ```bash
   npx supabase link --project-ref [PROJECT_REF]
   npx supabase db push
   ```
3. **Storage Buckets:**
   Verify the following buckets exist in Supabase Storage:
   - `documents` (Private, 15MB limit)
   - `portfolio` (Public, 100MB limit)
   - `public_assets` (Public, 10MB limit)
4. **Auth Settings:**
   - Site URL: `https://vowsstudio.com`
   - Additional Redirect URLs:
     - `https://vowsstudio.com/auth/callback`
     - `https://vowsstudio.com/api/auth/gmail/callback`
   - Enable Multi-Factor Authentication (TOTP).
   - Set Minimum AAL for SuperAdmin to `aal2`.
   - Disable Email Confirmations for staff invites if managed via internal invitation tokens.

---

## 4. Google Cloud Console (OAuth 2.0 Setup)

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Create project: `vows-studio-crm-prod`.
3. Configure OAuth Consent Screen:
   - User Type: **External**.
   - App Name: `VOWS Studio CRM`.
   - Scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Submit app verification for production use.
4. Create Credentials > OAuth 2.0 Client ID:
   - Application Type: Web Application.
   - Authorized Javascript Origins: `https://vowsstudio.com`.
   - Authorized Redirect URIs: `https://vowsstudio.com/api/auth/gmail/callback`.

---

## 5. Vercel Deployment & Crons

1. Connect Git repository to Vercel.
2. Select Framework Preset: `Next.js`.
3. Set Node.js Version: `20.x`.
4. Deploy project.
5. Verify Cron Jobs under Vercel Project > Settings > Cron Jobs:
   - `/api/cron/daily-digest`: `30 3 * * *` (09:00 IST)
   - `/api/cron/expiry-sweep`: `30 20 * * *` (02:00 IST)
   - `/api/cron/quotation-expiry`: `30 3 * * *` (09:00 IST)
   - `/api/cron/demo-reset`: `0 2 * * 0` (Sunday 02:00 UTC)

---

## 6. Pre-Flight Verification Commands

Run the full pre-deployment test suite:
```bash
# 1. Lint code
npm run lint

# 2. Typecheck
npm run typecheck

# 3. Test suite and coverage
npm run test:coverage

# 4. Production build validation
npm run build
```
Verify that all 62 routes compile successfully with zero errors.
