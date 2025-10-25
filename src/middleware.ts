import NextAuth from 'next-auth';
import authConfig from '../auth.config';

// Use only the edge-compatible config (no adapter)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    // Protect all routes except static files and API routes that handle their own auth
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
