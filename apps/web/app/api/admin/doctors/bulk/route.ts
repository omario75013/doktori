import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { inArray } from "drizzle-orm";

type BulkBody = {
  ids: string[];
  action: "activate" | "deactivate" | "delete";
};

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = (await req.json()) as BulkBody;
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids requis" }, { status: 400 });
    }
    if (!["activate", "deactivate", "delete"].includes(body.action)) {
      return NextResponse.json({ error: "action invalide" }, { status: 400 });
    }

    let count = 0;
    if (body.action === "delete") {
      const deleted = await db
        .delete(doctors)
        .where(inArray(doctors.id, body.ids))
        .returning({ id: doctors.id });
      count = deleted.length;
    } else {
      const isActive = body.action === "activate";
      const updated = await db
        .update(doctors)
        .set({ isActive, updatedAt: new Date() })
        .where(inArray(doctors.id, body.ids))
        .returning({ id: doctors.id });
      count = updated.length;
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: `doctors.bulk_${body.action}`,
      resourceType: "doctors",
      resourceId: null,
      before: null,
      after: { count, ids: body.ids },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("[POST /api//admin/doctors/bulk]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
