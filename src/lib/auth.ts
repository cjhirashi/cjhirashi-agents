// ═══════════════════════════════════════════════════════════
// NextAuth.js v5 Configuration
// Authentication with Credentials, Google, and GitHub
// ═══════════════════════════════════════════════════════════

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { UserRole, SubscriptionTier } from '@prisma/client';
import authConfig from '../../auth.config';

// ═══════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// Type extensions are in src/types/next-auth.d.ts
// ═══════════════════════════════════════════════════════════

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>, // Type assertion to resolve @auth/core version conflict

  // Use JWT strategy for stateless sessions
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Merge edge-compatible config from auth.config.ts
  ...authConfig,

  // Override pages with additional pages for full config
  pages: {
    ...authConfig.pages,
    verifyRequest: '/auth/verify',
    newUser: '/dashboard',
  },

  providers: [
    // ═════════════════════════════════════════════════════════
    // CREDENTIALS PROVIDER (Email + Password)
    // ═════════════════════════════════════════════════════════
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            subscriptionTier: true,
            isActive: true,
            // We need to fetch password from Account table for credentials provider
            accounts: {
              where: { provider: 'credentials' },
              select: { providerAccountId: true }, // This stores hashed password
            },
          },
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is inactive');
        }

        // Get password from credentials account
        const credentialsAccount = user.accounts[0];
        if (!credentialsAccount) {
          throw new Error('No credentials account found');
        }

        // Verify password
        const isValid = await compare(
          credentials.password as string,
          credentialsAccount.providerAccountId // We store hashed password here
        );

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          isActive: user.isActive,
        };
      },
    }),

    // ═════════════════════════════════════════════════════════
    // GOOGLE OAUTH PROVIDER
    // ═════════════════════════════════════════════════════════
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Link OAuth to existing email
    }),

    // ═════════════════════════════════════════════════════════
    // GITHUB OAUTH PROVIDER
    // ═════════════════════════════════════════════════════════
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Link OAuth to existing email
    }),
  ],

  // ═══════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════

  callbacks: {
    // JWT Callback: Add user data to token
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.role = user.role;
        token.tier = user.subscriptionTier;
        token.isActive = user.isActive;
      }

      // Handle session updates (e.g., tier change)
      if (trigger === 'update' && session) {
        if (session.tier) token.tier = session.tier;
        if (session.role) token.role = session.role;
        if (typeof session.isActive === 'boolean') token.isActive = session.isActive;
      }

      return token;
    },

    // Session Callback: Add token data to session
    async session({ session, token }) {
      if (session.user && token) {
        // Type assertions to satisfy TypeScript
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        session.user.tier = token.tier as SubscriptionTier;
        session.user.isActive = token.isActive as boolean;
      }

      return session;
    },

    // Sign In Callback: Control who can sign in
    async signIn({ user, account }) {
      // For OAuth providers, ensure user is created/updated
      if (account?.provider !== 'credentials' && user.email) {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If user doesn't exist, create with default role (USER) and tier (FREE)
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              avatar: user.image,
              emailVerified: new Date(), // OAuth emails are verified
              role: 'USER',
              subscriptionTier: 'FREE',
              isActive: true,
            },
          });
        }
      }

      return true;
    },

    // Redirect Callback: Control redirect after sign in/out
    async redirect({ url, baseUrl }) {
      // If the URL already absolute and belongs to same site, use it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // If the URL is relative, build full URL
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Default: redirect to dashboard after successful login
      return `${baseUrl}/dashboard`;
    },
  },

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════

  events: {
    async signIn({ user }) {
      // Update lastInteraction timestamp
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastInteraction: new Date() },
        });
      }
    },
  },

  // ═══════════════════════════════════════════════════════════
  // DEBUG (Development only)
  // ═══════════════════════════════════════════════════════════

  debug: process.env.NODE_ENV === 'development',
});
