import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  if (pathname === "/") {
    url.pathname = "/job-portal";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/recruiter-dashboard/:path*',
    '/applicant/:path*',
    '/dashboard/:path*',
    '/job-openings/:path*',
    '/whitecloak/:path*',
    '/admin-portal/:path*',
    '/'
  ],
};