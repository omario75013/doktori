import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db, doctors, adminUsers, clinics, secretaries } from "@doktori/db";
import { eq, and } from "drizzle-orm";

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
        const email = (credentials.email as string).toLowerCase();
        const [doctor] = await db
          .select()
          .from(doctors)
          .where(eq(doctors.email, email))
          .limit(1);
        if (!doctor) return null;
        const valid = await compare(credentials.password as string, doctor.passwordHash);
        if (!valid) return null;
        return {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          image: doctor.photoUrl ?? null,
          role: "doctor" as const,
        };
      },
    }),
    Credentials({
      id: "admin-credentials",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase();
        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(and(eq(adminUsers.email, email), eq(adminUsers.isActive, true)))
          .limit(1);
        if (!admin) return null;
        const valid = await compare(
          credentials.password as string,
          admin.passwordHash
        );
        if (!valid) return null;

        // Update last_login_at (fire-and-forget)
        db.update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, admin.id))
          .catch((e) => console.error("[auth] last_login_at update failed", e));

        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: "admin" as const,
          adminRole: admin.role,
        };
      },
    }),
    Credentials({
      id: "clinic-credentials",
      name: "Clinic Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase();
        const [clinic] = await db
          .select()
          .from(clinics)
          .where(eq(clinics.email, email))
          .limit(1);
        if (!clinic) return null;
        const valid = await compare(credentials.password as string, clinic.passwordHash);
        if (!valid) return null;
        return {
          id: clinic.id,
          name: clinic.name,
          email: clinic.email,
          role: "clinic" as const,
        };
      },
    }),
    Credentials({
      id: "secretary-credentials",
      name: "Secretary Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase();
        const [secretary] = await db
          .select()
          .from(secretaries)
          .where(and(eq(secretaries.email, email), eq(secretaries.isActive, true)))
          .limit(1);
        if (!secretary) return null;
        const valid = await compare(credentials.password as string, secretary.passwordHash);
        if (!valid) return null;
        return {
          id: secretary.id,
          name: secretary.name,
          email: secretary.email,
          role: "secretary" as const,
          doctorId: secretary.doctorId,
          clinicId: secretary.clinicId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        if (user.role) token.role = user.role;
        if (user.adminRole) token.adminRole = user.adminRole;
        if (user.doctorId) token.doctorId = user.doctorId;
        if ("clinicId" in user) token.clinicId = user.clinicId;
        if ("image" in user) token.picture = user.image ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        if (token.role) session.user.role = token.role;
        if (token.adminRole) session.user.adminRole = token.adminRole;
        if (token.doctorId) session.user.doctorId = token.doctorId;
        if ("clinicId" in token) session.user.clinicId = token.clinicId;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
  pages: { signIn: "/connexion" },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours for doctors and admins
  },
});
