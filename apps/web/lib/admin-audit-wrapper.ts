import "server-only";
import { NextResponse } from "next/server";
import { TransactionRollbackError } from "drizzle-orm";
import { db, type AdminRole, type Database } from "@doktori/db";
import { requireAdmin, type AdminSession } from "./admin-auth";
import { logAudit, extractRequestMeta } from "./admin-audit";

/**
 * Drizzle transaction handle. Inferred from `db.transaction` so the typing
 * stays in sync with the driver — no manual generic plumbing.
 */
export type DbTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface WithAdminAuditHandlerArgs<TCtx> {
  /** Drizzle transaction. Use this for all reads/writes inside the handler so
   *  the mutation rolls back automatically if you throw. */
  tx: DbTx;
  /** Authenticated admin session (already past requireAdmin). */
  admin: AdminSession;
  /** Resolved resource id (from getResourceId). */
  resourceId: string;
  /** Original request object. */
  req: Request;
  /** Original Next.js route context (typically `{ params: Promise<...> }`). */
  ctx: TCtx;
  /** Pre-parsed JSON body (if Content-Type was JSON and method is POST/PATCH/PUT).
   *  null when body parsing failed or method has no body. */
  body: unknown;
}

export interface WithAdminAuditOptions<TResult, TCtx = unknown> {
  /** Action label for audit log, e.g. `"doctors.activate"`, `"reviews.reject"`. */
  action: string | ((args: { req: Request; body: unknown }) => string);
  /** Resource type, e.g. `"doctors"`, `"reviews"`, `"appointments"`. */
  resourceType: string;
  /** Optional list of admin roles allowed (in addition to defaulting to `super_admin` only). */
  allowedRoles?: AdminRole[];
  /** Extract resource id from the route context or request — required for audit. */
  getResourceId: (req: Request, ctx: TCtx) => string | Promise<string>;
  /** Optional: fetch the "before" state inside the transaction, for the audit diff. */
  getBefore?: (args: {
    tx: DbTx;
    resourceId: string;
    req: Request;
    ctx: TCtx;
  }) => Promise<unknown> | unknown;
  /**
   * Mutation handler that executes inside the transaction.
   *
   * - Return any non-NextResponse value → wrapper writes audit log and JSON-encodes
   *   the value as the HTTP response body.
   * - Return a NextResponse directly → wrapper rolls back the transaction and
   *   returns the response as-is, **without writing an audit row**. Use this for
   *   validation 400s, 404s, and other early returns where no mutation should be
   *   recorded.
   * - Throw → transaction rolls back, no audit row, wrapper responds 500.
   */
  handler: (args: WithAdminAuditHandlerArgs<TCtx>) => Promise<TResult | NextResponse>;
  /** Optional: extract reason text from request body for the audit log. */
  getReason?: (args: { req: Request; body: unknown }) => string | null | undefined;
}

/**
 * Higher-order wrapper for admin mutation routes.
 *
 * Guarantees:
 * 1. Auth: short-circuits with 401/403 if `requireAdmin` fails.
 * 2. Transaction: handler runs inside `db.transaction`. If handler throws,
 *    the transaction rolls back and no audit row is written.
 * 3. Audit: on success, writes one row to `admin_audit_logs` with
 *    `{before, after, action, resourceType, resourceId, reason, ip, userAgent}`
 *    populated.
 *
 * Usage:
 *
 *     export const PATCH = withAdminAudit({
 *       action: "doctors.update",
 *       resourceType: "doctors",
 *       allowedRoles: ["super_admin"],
 *       getResourceId: async (_req, ctx) => (await ctx.params).id,
 *       getBefore: async ({ tx, resourceId }) => {
 *         const [row] = await tx.select().from(doctors).where(eq(doctors.id, resourceId)).limit(1);
 *         return row;
 *       },
 *       handler: async ({ tx, resourceId, body }) => {
 *         const [updated] = await tx.update(doctors).set(body).where(eq(doctors.id, resourceId)).returning();
 *         return updated;
 *       },
 *     });
 */
export function withAdminAudit<TResult, TCtx = unknown>(
  opts: WithAdminAuditOptions<TResult, TCtx>
) {
  return async function adminAuditedHandler(
    req: Request,
    ctx: TCtx
  ): Promise<NextResponse> {
    // Step 1: auth
    const admin = await requireAdmin(opts.allowedRoles ?? []);
    if (admin instanceof NextResponse) return admin;

    // Step 2: extract resource id
    let resourceId: string;
    try {
      resourceId = await opts.getResourceId(req, ctx);
    } catch (e) {
      console.error("[withAdminAudit] getResourceId threw:", e);
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // Step 3: parse body once if applicable, so the handler, action, and reason
    // helpers all see the same payload. We clone the request before reading to
    // leave the original consumable if downstream code re-reads it.
    let parsedBody: unknown = null;
    const method = req.method?.toUpperCase();
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      try {
        parsedBody = await req.clone().json();
      } catch {
        parsedBody = null;
      }
    }

    // Step 4: run transaction. On a NextResponse early-return, we trigger
    // tx.rollback() (which throws TransactionRollbackError) so the mutation is
    // discarded. We then return the captured NextResponse without writing an
    // audit row.
    const meta = extractRequestMeta(req);
    let before: unknown = undefined;
    let after: TResult | undefined = undefined;
    let earlyReturn: NextResponse | undefined = undefined;

    try {
      await db.transaction(async (tx) => {
        if (opts.getBefore) {
          before = await opts.getBefore({ tx, resourceId, req, ctx });
        }
        const result = await opts.handler({
          tx,
          admin,
          resourceId,
          req,
          ctx,
          body: parsedBody,
        });
        if (result instanceof NextResponse) {
          earlyReturn = result;
          tx.rollback(); // throws TransactionRollbackError — caught below
        }
        after = result as TResult;
      });
    } catch (e) {
      if (earlyReturn) {
        // Handler signalled early return via NextResponse — do not audit
        return earlyReturn;
      }
      if (e instanceof TransactionRollbackError) {
        // Defensive: shouldn't happen without earlyReturn set, but be explicit
        return NextResponse.json({ error: "Opération annulée" }, { status: 500 });
      }
      console.error(
        `[withAdminAudit] action=${stringifyAction(opts.action)} resource=${opts.resourceType}/${resourceId} failed:`,
        e
      );
      const msg = e instanceof Error ? e.message : "Erreur serveur";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Step 5: write audit log (outside the transaction — `logAudit` swallows
    // its own errors so an audit failure cannot mask the successful mutation).
    const action =
      typeof opts.action === "function"
        ? opts.action({ req, body: parsedBody })
        : opts.action;
    const reason = opts.getReason ? opts.getReason({ req, body: parsedBody }) : undefined;
    await logAudit({
      actor: admin,
      action,
      resourceType: opts.resourceType,
      resourceId,
      before: before ?? null,
      after: (after as unknown) ?? null,
      reason: reason ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json(after ?? { ok: true });
  };
}

function stringifyAction(action: WithAdminAuditOptions<unknown>["action"]): string {
  return typeof action === "function" ? "<dynamic>" : action;
}
