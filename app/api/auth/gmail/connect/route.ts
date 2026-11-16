import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildAuthUrl } from '@/lib/gmail/oauth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      return new NextResponse('Forbidden: Only Administrators can connect Gmail', { status: 403 });
    }

    const host = request.headers.get('x-forwarded-host') || request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    if (process.env.APP_MODE === 'demo') {
      return NextResponse.redirect(
        new URL('/crm/settings/gmail?error=gmail_disabled_in_demo', appBaseUrl)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || clientId === 'mock-client-id' || !clientSecret) {
      return NextResponse.redirect(
        new URL('/crm/settings/gmail?error=oauth_credentials_missing', appBaseUrl)
      );
    }

    // Generate cryptographically secure state
    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = buildAuthUrl(state, appBaseUrl);

    const response = NextResponse.redirect(authUrl);
    // Store state in httpOnly cookie with 10-minute expiry
    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return response;
  } catch (err: any) {
    console.error('Gmail connect route error:', err);
    return NextResponse.redirect(new URL('/crm/settings/gmail?error=gmail_connect_failed', request.url));
  }
}
