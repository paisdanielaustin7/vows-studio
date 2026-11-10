import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Route Protection proxy stub.
 * Thin request handler for session refresh, verified JWT claims, and route access control.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Cache-Control: private, no-store for /crm and /admin
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/crm') || pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
