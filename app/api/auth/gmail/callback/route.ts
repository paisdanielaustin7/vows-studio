import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { exchangeCodeForTokens, saveGmailTokens } from '@/lib/gmail/oauth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const settingsUrl = new URL('/crm/settings', request.url);

  if (error) {
    settingsUrl.searchParams.set('error', `google_oauth_${error}`);
    return NextResponse.redirect(settingsUrl);
  }

  const storedState = request.cookies.get('gmail_oauth_state')?.value;

  if (!state || !storedState || state !== storedState) {
    settingsUrl.searchParams.set('error', 'invalid_oauth_state');
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete('gmail_oauth_state');
    return res;
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      settingsUrl.searchParams.set('error', 'unauthorized_role');
      return NextResponse.redirect(settingsUrl);
    }

    const { accessToken, refreshToken, expiresIn, email } = await exchangeCodeForTokens(code);

    await saveGmailTokens({
      googleEmail: email,
      accessToken,
      refreshToken,
      expiresIn,
      connectedBy: user.id,
      keyId: 'k1',
    });

    settingsUrl.searchParams.set('tab', 'email');
    settingsUrl.searchParams.set('gmail_connected', 'true');

    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete('gmail_oauth_state');
    return res;
  } catch (err: any) {
    console.error('Gmail callback error:', err);
    settingsUrl.searchParams.set('error', 'token_exchange_failed');
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete('gmail_oauth_state');
    return res;
  }
}
