import { encryptSecret, decryptSecret } from '@/lib/utils';
import { getAdminClient } from '@/lib/supabase/admin';
import { GmailStatus } from './types';

const DEV_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getEncryptionKey(): string {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || DEV_KEY;
  return hex.padEnd(64, '0').slice(0, 64);
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/api/auth/gmail/callback`;
}

/**
 * Builds the Google OAuth authorization URL.
 */
export function buildAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = getRedirectUri();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errorText}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;

  // Retrieve user email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let email = 'connected-user@gmail.com';
  if (userRes.ok) {
    const userData = await userRes.json();
    if (userData.email) email = userData.email;
  }

  return { accessToken, refreshToken, expiresIn, email };
}

/**
 * Stores tokens securely using application-layer AES-256-GCM authenticated encryption.
 */
export async function saveGmailTokens(params: {
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  connectedBy: string;
  keyId?: string;
}): Promise<void> {
  const key = getEncryptionKey();
  const keyId = params.keyId || 'k1';

  const accessEnc = encryptSecret(params.accessToken, key, keyId);
  const refreshEnc = encryptSecret(params.refreshToken, key, keyId);

  const expiresAt = new Date(Date.now() + params.expiresIn * 1000).toISOString();

  const supabase = getAdminClient();
  const { error } = await supabase.from('gmail_credentials').upsert(
    {
      id: 1,
      google_email: params.googleEmail,
      access_token_enc: accessEnc,
      refresh_token_enc: refreshEnc,
      token_expires_at: expiresAt,
      scopes: GMAIL_SCOPES,
      status: 'connected',
      connected_by: params.connectedBy,
      connected_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to save Gmail credentials: ${error.message}`);
  }
}

/**
 * Retrieves valid decrypted access token, automatically refreshing if expired.
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  senderEmail: string;
  fromName: string | null;
  replyTo: string | null;
}> {
  const supabase = getAdminClient();
  const { data: creds, error } = await supabase
    .from('gmail_credentials')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !creds || creds.status === 'disconnected') {
    throw new Error('Gmail is not connected. Connect Gmail in Settings to enable emails.');
  }

  const key = getEncryptionKey();
  const expiresAt = new Date(creds.token_expires_at).getTime();
  const now = Date.now();

  // If token has at least 5 minutes of validity remaining, return it
  if (expiresAt - now > 5 * 60 * 1000) {
    const accessToken = decryptSecret(creds.access_token_enc, key);
    return {
      accessToken,
      senderEmail: creds.google_email,
      fromName: creds.from_name,
      replyTo: creds.reply_to,
    };
  }

  // Refresh expired access token
  const refreshToken = decryptSecret(creds.refresh_token_enc, key);
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) {
    // Mark status as needs_reconnect
    await supabase
      .from('gmail_credentials')
      .update({ status: 'needs_reconnect', last_error: 'Refresh token expired or revoked by Google' })
      .eq('id', 1);

    throw new Error('Gmail authorization has expired. Reconnection required in Settings.');
  }

  const refreshData = await refreshRes.json();
  const newAccessToken = refreshData.access_token;
  const newExpiresIn = refreshData.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

  const newAccessEnc = encryptSecret(newAccessToken, key, 'k1');

  await supabase
    .from('gmail_credentials')
    .update({
      access_token_enc: newAccessEnc,
      token_expires_at: newExpiresAt,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  return {
    accessToken: newAccessToken,
    senderEmail: creds.google_email,
    fromName: creds.from_name,
    replyTo: creds.reply_to,
  };
}

/**
 * Revokes Google access and marks credentials as disconnected.
 */
export async function disconnectGmail(): Promise<void> {
  const supabase = getAdminClient();
  const { data: creds } = await supabase
    .from('gmail_credentials')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (creds && creds.refresh_token_enc) {
    try {
      const key = getEncryptionKey();
      const refreshToken = decryptSecret(creds.refresh_token_enc, key);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) {
      console.warn('Revoke token call failed at Google, continuing local disconnect:', e);
    }
  }

  await supabase
    .from('gmail_credentials')
    .update({
      status: 'disconnected',
      access_token_enc: '',
      refresh_token_enc: '',
      last_error: 'Disconnected by administrator',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
}

/**
 * Gets the current public Gmail status without leaking any token data.
 */
export async function getGmailStatus(): Promise<GmailStatus> {
  const supabase = getAdminClient();
  const { data: creds, error } = await supabase
    .from('gmail_credentials')
    .select('google_email, from_name, reply_to, status, connected_at, last_error')
    .eq('id', 1)
    .maybeSingle();

  if (error || !creds) {
    return {
      status: 'disconnected',
      googleEmail: null,
      fromName: null,
      replyTo: null,
      connectedAt: null,
      lastError: null,
    };
  }

  return {
    status: creds.status,
    googleEmail: creds.google_email,
    fromName: creds.from_name,
    replyTo: creds.reply_to,
    connectedAt: creds.connected_at,
    lastError: creds.last_error,
  };
}
