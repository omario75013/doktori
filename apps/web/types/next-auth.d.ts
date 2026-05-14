import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

type Role = "doctor" | "admin" | "clinic" | "secretary" | "lab";
type AdminRoleType =
  | "super_admin"
  | "moderator"
  | "finance"
  | "support"
  | "marketing";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: Role;
    adminRole?: AdminRoleType;
    doctorId?: string;
    clinicId?: string | null;
  }

  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role?: Role;
      adminRole?: AdminRoleType;
      /** Set when role === "secretary" — the doctor this secretary manages */
      doctorId?: string;
      /** Set when role === "secretary" — the clinic this secretary manages (if applicable) */
      clinicId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: Role;
    adminRole?: AdminRoleType;
    /** Set when role === "secretary" — the doctor this secretary manages */
    doctorId?: string;
    /** Set when role === "secretary" — the clinic this secretary manages (if applicable) */
    clinicId?: string | null;
  }
}
