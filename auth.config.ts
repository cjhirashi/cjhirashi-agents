import type { NextAuthConfig } from 'next-auth';

/**
 * Auth configuration for middleware (Edge Runtime compatible)
 * No database adapter here - that's in auth.ts
 * Providers are defined in auth.ts (not edge-compatible)
 */
const authConfig = {
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes that don't require authentication
      const publicRoutes = ['/', '/auth/signin', '/auth/signup', '/auth/error'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      // Allow public routes
      if (isPublicRoute) {
        return true;
      }

      // Protected routes require authentication
      const isProtectedRoute = pathname.startsWith('/dashboard') ||
                               pathname.startsWith('/api/v1/chat') ||
                               pathname.startsWith('/api/v1/agents') ||
                               pathname.startsWith('/api/v1/documents');

      if (isProtectedRoute && !isLoggedIn) {
        return false; // Redirect to signin
      }

      // Admin-only routes
      if (pathname.startsWith('/dashboard/admin')) {
        const userRole = auth?.user?.role;
        return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      }

      return true;
    },
  },
  providers: [], // Providers must be defined here for edge compatibility, actual providers in auth.ts
} satisfies NextAuthConfig;

export default authConfig;
