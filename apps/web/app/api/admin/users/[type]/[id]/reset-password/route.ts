import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import {
  db,
  doctors,
  clinics,
  labs,
  labUsers,
  secretaries,
  staffPasswordResetTokens,
} from "@doktori/db";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sendEmail } from "@/lib/email";
import { buildStaffPasswordResetEmail } from "@/emails/templates";

type ActorType = "doctor" | "clinic" | "lab" | "lab_user" | "secretary";
type RouteContext = { params: Promise<{ type: string; id: string }> };

const ACTOR_LABELS: Record<ActorType, string> = {
  doctor: "Médecin",
  clinic: "Clinique",
  lab: "Laboratoire",
  lab_user: "Utilisateur laboratoire",
  secretary: "Secrétaire",
};

const ACTOR_TYPES = new Set<ActorType>([
  "doctor",
  "clinic",
  "lab",
  "lab_user",
  "secretary",
]);

async function loadActor(type: ActorType, id: string) {
  if (type === "doctor") {
    const [row] = await db.select({ id: doctors.id, email: doctors.email, name: doctors.name }).from(doctors).where(eq(doctors.id, id)).limit(1);
    return row ?? null;
  }
  if (type === "clinic") {
    const [row] = await db.select({ id: clinics.id, email: clinics.email, name: clinics.name }).from(clinics).where(eq(clinics.id, id)).limit(1);
    return row ?? null;
  }
  if (type === "lab") {
    const [row] = await db.select({ id: labs.id, email: labs.email, name: labs.name }).from(labs).where(eq(labs.id, id)).limit(1);
    return row ?? null;
  }
  if (type === "lab_user") {
    const [row] = await db
      .select({ id: labUsers.id, email: labUsers.email, firstName: labUsers.firstName, lastName: labUsers.lastName })
      .from(labUsers)
      .where(eq(labUsers.id, id))
      .limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, name: `${row.firstName} ${row.lastName}`.trim() };
  }
  if (type === "secretary") {
    const [row] = await db.select({ id: secretaries.id, email: secretaries.email, name: secretaries.name }).from(secretaries).where(eq(secretaries.id, id)).limit(1);
    return row ?? null;
  }
  return null;
}

async function setPassword(type: ActorType, id: string, passwordHash: string) {
  if (type === "doctor") return db.update(doctors).set({ passwordHash }).where(eq(doctors.id, id));
  if (type === "clinic") return db.update(clinics).set({ passwordHash }).where(eq(clinics.id, id));
  if (type === "lab") return db.update(labs).set({ passwordHash }).where(eq(labs.id, id));
  if (type === "lab_user") return db.update(labUsers).set({ passwordHash }).where(eq(labUsers.id, id));
  if (type === "secretary") return db.update(secretaries).set({ passwordHash }).where(eq(secretaries.id, id));
}

export const POST = withAdminAudit<{ ok: true; mode: string }, RouteContext>({
  action: ({ body }) => {
    const b = body as { mode?: string } | null;
    return b?.mode === "set" ? "users.password_reset_set" : "users.password_reset_link";
  },
  resourceType: "user_password_reset",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => {
    const { type, id } = await ctx.params;
    return `${type}:${id}`;
  },
  handler: async ({ ctx, body }) => {
    const { type, id } = await ctx.params;
    if (!ACTOR_TYPES.has(type as ActorType)) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }
    const actorType = type as ActorType;
    const b = (body ?? {}) as { mode?: string; password?: string };
    const mode = b.mode === "set" ? "set" : "link";

    const actor = await loadActor(actorType, id);
    if (!actor) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    if (mode === "set") {
      const password = (b.password ?? "").trim();
      if (password.length < 8) {
        return NextResponse.json({ error: "Mot de passe trop court (min 8)" }, { status: 400 });
      }
      const passwordHash = hashSync(password, 10);
      await setPassword(actorType, id, passwordHash);
      return { ok: true, mode } as const;
    }

    // mode === "link"
    if (!actor.email) {
      return NextResponse.json({ error: "Pas d'email enregistré pour cet utilisateur" }, { status: 400 });
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(staffPasswordResetTokens).values({
      tokenHash,
      actorType,
      actorId: id,
      expiresAt,
    });
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://doktori.tn";
    const resetUrl = `${baseUrl}/reset-password-pro/${rawToken}`;
    const tpl = buildStaffPasswordResetEmail({
      recipientName: actor.name,
      actorLabel: ACTOR_LABELS[actorType],
      resetUrl,
    });
    await sendEmail({
      to: actor.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    return { ok: true, mode } as const;
  },
});
