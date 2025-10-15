import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Log para debug
      console.log("SignIn callback triggered", { user, account, profile });

      // Siempre permitir el login
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Log para debug
      console.log("Redirect callback triggered", { url, baseUrl });

      // Si la URL ya es absoluta y pertenece al mismo sitio, usarla
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Si la URL es relativa, construir la URL completa
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Por defecto, redirigir al dashboard después del login exitoso
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, account }) {
      // Log para debug
      console.log("JWT callback triggered", { token, user, account });

      // Guardar el ID del usuario en el token cuando se crea por primera vez
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Log para debug
      console.log("Session callback triggered", { session, token });

      // Agregar el ID del usuario a la sesión desde el token
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt", // Cambiado de "database" a "jwt" para que funcione con middleware
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true, // Activar logs de debug de NextAuth
};
