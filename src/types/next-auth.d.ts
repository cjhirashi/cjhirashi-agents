import NextAuth, { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "@auth/core/jwt"
import type { UserRole, SubscriptionTier } from "@prisma/client"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a callback parameter
   */
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      tier: SubscriptionTier
      isActive: boolean
    } & DefaultSession["user"]
  }

  /**
   * The shape of the user object returned in the OAuth providers'
   * `profile` callback, or the `signIn` callback
   */
  interface User {
    id: string
    email: string
    role: UserRole
    subscriptionTier: SubscriptionTier
    isActive: boolean
  }
}

declare module "@auth/core/jwt" {
  /**
   * Returned by the `jwt` callback and `auth()`, when using JWT sessions
   */
  interface JWT extends DefaultJWT {
    id: string
    email: string
    role: UserRole
    tier: SubscriptionTier
    isActive: boolean
  }
}
