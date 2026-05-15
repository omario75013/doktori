import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";
import { rejectClinicDoctorSession } from "@/lib/clinic-doctor-guard";
import {
  db,
  promoCodes,
  promoCodeUsages,
  subscriptions,
  doctorWallets,
  walletTransactions,
} from "@doktori/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const doctor = await requireDoctor();
    if (doctor instanceof NextResponse) return doctor;
    const clinicRejection = rejectClinicDoctorSession(doctor);
    if (clinicRejection) return clinicRejection;

    const body = (await req.json()) as Record<string, unknown>;
    const { code } = body;

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Le code promo est requis." }, { status: 422 });
    }

    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();

    // Find the promo code
    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, normalizedCode))
      .limit(1);

    if (!promo) {
      return NextResponse.json({ error: "Code promo invalide." }, { status: 404 });
    }

    if (!promo.isActive) {
      return NextResponse.json({ error: "Ce code promo n'est plus actif." }, { status: 409 });
    }

    if (promo.validFrom > now) {
      return NextResponse.json({ error: "Ce code promo n'est pas encore valide." }, { status: 409 });
    }

    if (promo.validUntil && promo.validUntil < now) {
      return NextResponse.json({ error: "Ce code promo a expiré." }, { status: 409 });
    }

    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return NextResponse.json({ error: "Ce code promo a atteint sa limite d'utilisations." }, { status: 409 });
    }

    // Check if doctor has already used this code
    const [existingUsage] = await db
      .select({ id: promoCodeUsages.id })
      .from(promoCodeUsages)
      .where(
        and(
          eq(promoCodeUsages.promoCodeId, promo.id),
          eq(promoCodeUsages.doctorId, doctor.id)
        )
      )
      .limit(1);

    if (existingUsage) {
      return NextResponse.json({ error: "Vous avez déjà utilisé ce code promo." }, { status: 409 });
    }

    let discountAmount = 0;
    let description = "";
    let appliedTo: string | null = null;

    if (promo.type === "free_months") {
      // Extend subscription by N months
      const months = promo.value;
      const [activeSub] = await db
        .select({ id: subscriptions.id, endsAt: subscriptions.endsAt })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.doctorId, doctor.id),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      if (activeSub) {
        const baseDate = activeSub.endsAt ?? now;
        const newEndsAt = new Date(baseDate);
        newEndsAt.setMonth(newEndsAt.getMonth() + months);

        await db
          .update(subscriptions)
          .set({ endsAt: newEndsAt, updatedAt: new Date() })
          .where(eq(subscriptions.id, activeSub.id));

        appliedTo = activeSub.id;
      } else {
        // Create a free subscription
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + months);

        const [newSub] = await db
          .insert(subscriptions)
          .values({
            doctorId: doctor.id,
            plan: "essentiel",
            status: "active",
            priceMillimes: 0,
            billingCycle: "monthly",
            paymentProvider: "manual",
            externalRef: `promo-${promo.code}`,
            startsAt: now,
            endsAt,
          })
          .returning({ id: subscriptions.id });

        appliedTo = newSub.id;
      }

      discountAmount = 0; // value tracked as months, not millimes
      description = `${months} mois gratuit${months > 1 ? "s" : ""} offert${months > 1 ? "s" : ""}`;
    } else if (promo.type === "percentage") {
      // Store discount for billing reference — no immediate action
      discountAmount = promo.value; // store raw percentage
      description = `Réduction de ${promo.value}% sur votre prochain abonnement`;
    } else if (promo.type === "fixed_amount") {
      // Credit doctor wallet
      const amountMillimes = promo.value;
      discountAmount = amountMillimes;

      // Upsert wallet
      await db
        .insert(doctorWallets)
        .values({
          doctorId: doctor.id,
          balance: amountMillimes,
          totalEarned: amountMillimes,
          totalCommission: 0,
          totalWithdrawn: 0,
        })
        .onConflictDoUpdate({
          target: doctorWallets.doctorId,
          set: {
            balance: sql`${doctorWallets.balance} + ${amountMillimes}`,
            totalEarned: sql`${doctorWallets.totalEarned} + ${amountMillimes}`,
            updatedAt: new Date(),
          },
        });

      await db.insert(walletTransactions).values({
        doctorId: doctor.id,
        type: "promo_credit",
        amount: amountMillimes,
        description: `Crédit code promo ${promo.code}`,
      });

      description = `Crédit de ${(amountMillimes / 1000).toFixed(2)} DT ajouté à votre portefeuille`;
    }

    // Record usage
    await db.insert(promoCodeUsages).values({
      promoCodeId: promo.id,
      doctorId: doctor.id,
      appliedTo: appliedTo ?? undefined,
      discountAmount,
    });

    // Increment usage counter
    await db
      .update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
      .where(eq(promoCodes.id, promo.id));

    return NextResponse.json({
      success: true,
      discount: {
        type: promo.type,
        value: promo.value,
        description,
      },
    });
  } catch (e) {
    console.error("[POST /api//doctor/apply-promo]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
