# Runbook: Google Cloud & Gmail OAuth Setup

> **Project:** VOWS Studio CRM  
> **Applicable Decision:** D-03, D-10, D-27 (DECISION_LOG.md)  
> **Target Audience:** System Administrators, DevOps, Business Owners  

---

## 1. Overview & Architecture

VOWS Studio CRM integrates with the studio's primary Google account to transmit quotations, invoices, receipts, and system recovery links.

- **Sender Address:** Dynamic (not hardcoded); configured by the owner during setup.
- **Security:** Tokens are encrypted in the application layer using **AES-256-GCM** before database storage.
- **Daily Budget:** 500 recipients/day Google limit (soft budget enforced at **400 sends/day**).
- **Scope Restriction:** Write-only (`gmail.send`), identity (`openid`, `email`). Inbox reading (`gmail.readonly`) is **strictly forbidden**.

---

## 2. Google Cloud Console Configuration

### Step 1: Create or Select Google Cloud Project
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `VOWS-Studio-CRM` (or select existing).

### Step 2: Enable the Gmail API
1. Open **APIs & Services** → **Library**.
2. Search for **Gmail API**.
3. Click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**.
2. Select **External** user type (Internal is only available for Google Workspace domains).
3. Fill in:
   - **App name:** `VOWS Studio CRM`
   - **User support email:** Studio owner's email (e.g. `vowsbyreuben@gmail.com`)
   - **Developer contact information:** Your technical contact email
4. Click **Save and Continue**.
5. **Scopes Configuration:**
   - Click **Add or Remove Scopes**.
   - Add:
     - `https://www.googleapis.com/auth/gmail.send`
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Do **NOT** select `gmail.readonly` or any full Gmail scope.
6. **Publishing Status (CRITICAL):**
   - In the **OAuth consent screen** summary page, set the Publishing status to **In Production**.
   - > [!IMPORTANT]
     > Google projects left in "Testing" status automatically expire refresh tokens after **7 days**, which causes the CRM connection to disconnect weekly. Setting to **In Production** allows tokens to persist indefinitely until revoked.
   - An "Unverified App" warning will appear when connecting for the first time. For single-tenant internal studio use, click **Advanced → Proceed to VOWS Studio CRM (unsafe)**. Unverified apps have a 100-user limit, which is more than sufficient.

---

## 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Select **Web application**.
4. Set **Name:** `VOWS Studio Web App`.
5. Configure **Authorized JavaScript origins**:
   - `http://localhost:3000` (Local Development)
   - `https://your-crm-domain.com` (Production Vercel Domain)
6. Configure **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/gmail/callback`
   - `https://your-crm-domain.com/api/auth/gmail/callback`
7. Click **Create**.
8. Note down the **Client ID** and **Client Secret**.

---

## 4. Environment Variables Configuration

Add the following keys to your `.env.local` (and Vercel Project Settings for Production):

```bash
# Google Cloud OAuth Credentials
GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-client-secret>"

# 32-Byte Hex Encryption Key for AES-256-GCM Token Storage
# Generate with: openssl rand -hex 32
GOOGLE_TOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Canonical App URL (Used for OAuth redirect computation)
NEXT_PUBLIC_APP_URL="https://your-crm-domain.com"
```

---

## 5. Connecting & Testing in CRM

1. Log in to VOWS Studio CRM as **System Admin** or **Business Owner**.
2. Navigate to **Settings** → **Integrations & Comm** → **Gmail Integration** (`/crm/settings/gmail`).
3. Click **Connect with Google**.
4. Log in with the studio sender account (e.g. `vowsbyreuben@gmail.com`) and grant permissions.
5. Upon redirect, the card will display:
   - Status: `CONNECTED` (green badge)
   - Connected Google Account address
   - Timestamp of authorization
6. In **Send Test Transmission**, enter an email address and click **Send Test**.
7. Confirm that the test message arrives in the destination inbox with sender header `VOWS Studio by Reuben`.

---

## 6. Disconnect & Change Account Workflow

- **Disconnect:** Clicking "Disconnect Account" immediately revokes the refresh token with Google's revocation endpoint and marks the status as `disconnected`.
- **Change Account:** To switch to a different Google account:
  1. Click **Disconnect Account**.
  2. Click **Connect with Google**.
  3. Choose the new Google account on Google's consent screen.
  4. The CRM automatically binds to the new account without affecting past email records.

---

## 7. Troubleshooting & Error States

| Status / Error | Cause | Resolution |
|---|---|---|
| `NEEDS_RECONNECT` | Google account password changed, or token unused for 6 months | Click **Reconnect Gmail** in Settings. Outgoing emails automatically offer PDF download fallback while in this state. |
| `invalid_oauth_state` | State cookie expired (>10 mins) or browser blocked CSRF cookie | Clear browser cookies and click Connect again. |
| `Daily transmission limit reached` | Studio reached 400 sends within 24h | Download PDF documents directly from the CRM and send manually for the remainder of the day. Budget resets at midnight IST. |
| `redirect_uri_mismatch` | Current origin does not match Google Cloud console | Ensure `NEXT_PUBLIC_APP_URL` exactly matches one of the URIs configured in Google Cloud console Credentials. |
