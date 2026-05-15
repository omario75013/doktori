import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

type Role = "doctor" | "admin" | "clinic" | "secretary" | "lab" | "lab_user";
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
    /** Phase 3: the doctor_practices row this secretary is scoped to */
    practiceId?: string | null;
    /** Lab multi-user: the lab this user belongs to (role === "lab_user") */
    labId?: string;
    /** Lab multi-user: the user's role within the lab ('admin' | 'technician') */
    labUserRole?: "admin" | "technician";
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
      /** Phase 3: the doctor_practices row this secretary is scoped to */
      practiceId?: string | null;
      /** Lab multi-user: the lab this user belongs to (role === "lab_user") */
      labId?: string;
      /** Lab multi-user: the user's role within the lab ('admin' | 'technician') */
      labUserRole?: "admin" | "technician";
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
    /** Phase 3: the doctor_practices row this secretary is scoped to */
    practiceId?: string | null;
    /** Lab multi-user: the lab this user belongs to (role === "lab_user") */
    labId?: string;
    /** Lab multi-user: the user's role within the lab ('admin' | 'technician') */
    labUserRole?: "admin" | "technician";
  }
}
