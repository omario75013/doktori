import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import {
  buildVerificationApprovedEmail,
  buildVerificationRejectedEmail,
} from "@/emails/templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://doktori.tn";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    let body: { action: "approve" | "reject"; reason?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return NextResponse.json(
        { error: "action doit être 'approve' ou 'reject'" },
        { status: 400 }
      );
    }

    if (body.action === "reject" && !body.reason?.trim()) {
      return NextResponse.json(
        { error: "Une raison est requise pour refuser un médecin" },
        { status: 400 }
      );
    }

    const [before] = await db
      .select({
        id: doctors.id,
        name: doctors.name,
        email: doctors.email,
        slug: doctors.slug,
        verificationStatus: doctors.verificationStatus,
      })
      .from(doctors)
      .where(eq(doctors.id, id))
      .limit(1);

    if (!before) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const now = new Date();

    if (body.action === "approve") {
      await db
        .update(doctors)
        .set({
          verificationStatus: "approved",
          verificationNote: null,
          verifiedAt: now,
          isVisible: true,
          isActive: true,
          updatedAt: now,
        })
        .where(eq(doctors.id, id));

      // Send approval email (fire-and-forget)
      const email = buildVerificationApprovedEmail({
        doctorName: before.name,
        profileUrl: `${BASE_URL}/medecin/${before.slug}`,
      });
      sendEmail({ to: before.email, subject: email.subject, html: email.html }).catch(
        console.error
      );
    } else {
      await db
        .update(doctors)
        .set({
          verificationStatus: "rejected",
          verificationNote: body.reason!.trim(),
          isVisible: false,
          updatedAt: now,
        })
        .where(eq(doctors.id, id));

      // Send rejection email (fire-and-forget)
      const email = buildVerificationRejectedEmail({
        doctorName: before.name,
        reason: body.reason!.trim(),
        uploadUrl: `${BASE_URL}/verification`,
      });
      sendEmail({ to: before.email, subject: email.subject, html: email.html }).catch(
        console.error
      );
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: body.action === "approve" ? "doctors.verify.approve" : "doctors.verify.reject",
      resourceType: "doctors",
      resourceId: id,
      before: { verificationStatus: before.verificationStatus },
      after: {
        verificationStatus: body.action === "approve" ? "approved" : "rejected",
        reason: body.reason ?? null,
      },
      reason: body.reason ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/admin/doctors/[id]/verify]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
