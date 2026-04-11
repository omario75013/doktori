import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

type Role = "doctor" | "admin";
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
  }

  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role?: Role;
      adminRole?: AdminRoleType;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: Role;
    adminRole?: AdminRoleType;
  }
}
