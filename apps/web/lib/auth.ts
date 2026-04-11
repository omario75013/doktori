import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "doctor-credentials",
      name: "Doctor Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [doctor] = await db
          .select()
          .from(doctors)
          .where(eq(doctors.email, credentials.email as string))
          .limit(1);
        if (!doctor) return null;
        const valid = await compare(credentials.password as string, doctor.passwordHash);
        if (!valid) return null;
        return { id: doctor.id, name: doctor.name, email: doctor.email, role: "doctor" as const };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: { signIn: "/connexion" },
  session: { strategy: "jwt" },
});
