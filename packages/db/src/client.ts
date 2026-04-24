import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// In dev, Next.js HMR re-imports this module on every edit which leaks postgres
// clients — each new client opens its own pool and eventually Postgres errors
// with "sorry, too many clients already". Keep a single instance per process.
const globalForDb = globalThis as unknown as {
  __doktoriPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__doktoriPg ??
  postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__doktoriPg = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
