import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: "doctor";
  }

  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: "doctor";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "doctor";
  }
}
