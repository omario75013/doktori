import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, subscriptions, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["extend_trial", "activate_premium", "suspend", "reactivate"]);

/**
 * PATCH /api/admin/subscriptions/[id]
 * Body: { action: "extend_trial" | "activate_premium" | "suspend" | "reactivate" }
 *
 * - extend_trial    → extends endsAt by 1 month
 * - activate_premium → creates or updates subscription to premium/active
 * - suspend          → sets doctor.is_active = false (hides from listings)
 * - reactivate       → sets doctor.is_active = true
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const action = body.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Action invalide. Valeurs acceptées : extend_trial, activate_premium, suspend, reactivate" },
      { status: 400 }
    );
  }

  // Fetch the subscription to verify it exists
  const [sub] = await db
    .select({ id: subscriptions.id, doctorId: subscriptions.doctorId })
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  switch (action) {
    case "extend_trial": {
      // Extend endsAt by 1 month from now (or from current endsAt if it's in the future)
      await db.execute(sql`
        UPDATE subscriptions
        SET ends_at = GREATEST(COALESCE(ends_at, NOW()), NOW()) + interval '1 month',
            updated_at = NOW()
        WHERE id = ${id}
      `);
      return NextResponse.json({ success: true, action, message: "Essai prolongé d'1 mois" });
    }

    case "activate_premium": {
      // Upsert subscription to premium/active for 1 month from now
      await db.execute(sql`
        UPDATE subscriptions
        SET plan = 'pro',
            status = 'active',
            starts_at = NOW(),
            ends_at = NOW() + interval '1 month',
            cancelled_at = NULL,
            updated_at = NOW()
        WHERE id = ${id}
      `);
      return NextResponse.json({ success: true, action, message: "Abonnement activé en Premium" });
    }

    case "suspend": {
      // Hide doctor from public listings without cancelling subscription
      await db
        .update(doctors)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(doctors.id, sub.doctorId));
      return NextResponse.json({ success: true, action, message: "Médecin suspendu (profil masqué)" });
    }

    case "reactivate": {
      // Restore doctor visibility
      await db
        .update(doctors)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(doctors.id, sub.doctorId));
      return NextResponse.json({ success: true, action, message: "Médecin réactivé (profil visible)" });
    }
  }

  // Unreachable — ALLOWED_ACTIONS guard above
  return NextResponse.json({ error: "Action non traitée" }, { status: 500 });
}
