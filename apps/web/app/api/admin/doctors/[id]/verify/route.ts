import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import {
  buildVerificationApprovedEmail,
  buildVerificationRejectedEmail,
} from "@/emails/templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://doktori.tn";

type RouteContext = { params: Promise<{ id: string }> };

type VerifyBody = { action: "approve" | "reject"; reason?: string };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  action: ({ body }) => {
    const b = body as VerifyBody | null;
    return b?.action === "approve" ? "doctors.verify.approve" : "doctors.verify.reject";
  },
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as VerifyBody | null;
    return b?.reason ?? null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({
        id: doctors.id,
        name: doctors.name,
        email: doctors.email,
        slug: doctors.slug,
        verificationStatus: doctors.verificationStatus,
      })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    return row ? { verificationStatus: row.verificationStatus } : null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = body as VerifyBody | null;
    if (!b || !b.action || !["approve", "reject"].includes(b.action)) {
      return NextResponse.json(
        { error: "action doit être 'approve' ou 'reject'" },
        { status: 400 }
      );
    }
    if (b.action === "reject" && !b.reason?.trim()) {
      return NextResponse.json(
        { error: "Une raison est requise pour refuser un médecin" },
        { status: 400 }
      );
    }

    const [before] = await tx
      .select({
        id: doctors.id,
        name: doctors.name,
        email: doctors.email,
        slug: doctors.slug,
        verificationStatus: doctors.verificationStatus,
      })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!before) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const now = new Date();
    if (b.action === "approve") {
      await tx
        .update(doctors)
        .set({
          verificationStatus: "approved",
          verificationNote: null,
          verifiedAt: now,
          isVisible: true,
          isActive: true,
          updatedAt: now,
        })
        .where(eq(doctors.id, resourceId));

      const email = buildVerificationApprovedEmail({
        doctorName: before.name,
        profileUrl: `${BASE_URL}/medecin/${before.slug}`,
      });
      sendEmail({ to: before.email, subject: email.subject, html: email.html }).catch(
        console.error
      );
    } else {
      const reason = b.reason!.trim();
      await tx
        .update(doctors)
        .set({
          verificationStatus: "rejected",
          verificationNote: reason,
          isVisible: false,
          updatedAt: now,
        })
        .where(eq(doctors.id, resourceId));

      const email = buildVerificationRejectedEmail({
        doctorName: before.name,
        reason,
        uploadUrl: `${BASE_URL}/verification`,
      });
      sendEmail({ to: before.email, subject: email.subject, html: email.html }).catch(
        console.error
      );
    }

    return { ok: true } as const;
  },
});
