import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getServerSession } from 'next-auth/next'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    phone?: string
  }
  interface Session {
    user: User & {
      id: string
      role: string
      phone?: string
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.select().from(users).where(eq(users.email, credentials.email as string)).then(res => res[0])
        if (!user || !user.hashedPassword) return null
        if (user.role === 'inactive') return null

        const isValid = await bcrypt.compare(credentials.password as string, user.hashedPassword)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone || undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const tokenUserId = (token.id as string | undefined) ?? token.sub

      if (tokenUserId) {
        const dbUser = await db.select({
          id: users.id,
          role: users.role,
          phone: users.phone,
        })
          .from(users)
          .where(eq(users.id, tokenUserId))
          .limit(1)
          .then((rows) => rows[0])

        if (!dbUser || dbUser.role === 'inactive') {
          delete token.sub
          delete token.id
          delete token.role
          delete token.phone
          return token
        }

        token.id = dbUser.id
        token.role = dbUser.role
        token.phone = dbUser.phone ?? undefined
      }

      if (user) {
        token.id = user.id
        token.role = user.role
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? ''
        session.user.role = (token.role as string | undefined) ?? 'inactive'
        session.user.phone = token.phone as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
}

export function auth() {
  return getServerSession(authOptions)
}
