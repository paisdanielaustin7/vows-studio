import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth';
import { buildAuthUrl } from '@/lib/gmail/oauth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      return new NextResponse('Forbidden: Only Administrators can connect Gmail', { status: 403 });
    }

    // Generate cryptographically secure state
    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = buildAuthUrl(state);

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
    return NextResponse.redirect(new URL('/crm/settings?error=gmail_connect_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
