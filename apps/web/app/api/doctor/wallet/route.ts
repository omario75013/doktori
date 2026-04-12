import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, doctorWallets, walletTransactions } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

async function ensureWallet(doctorId: string) {
  const [existing] = await db
    .select()
    .from(doctorWallets)
    .where(eq(doctorWallets.doctorId, doctorId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(doctorWallets)
    .values({ doctorId })
    .onConflictDoNothing()
    .returning();

  // If onConflictDoNothing skipped the insert, fetch the existing row
  if (!created) {
    const [row] = await db
      .select()
      .from(doctorWallets)
      .where(eq(doctorWallets.doctorId, doctorId))
      .limit(1);
    return row;
  }

  return created;
}

export async function GET() {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const wallet = await ensureWallet(doctor.id);

  const transactions = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.doctorId, doctor.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(50);

  return NextResponse.json({ wallet, transactions });
}

export async function POST(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { amount } = body as Record<string, unknown>;

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Le montant doit être un entier positif (en millimes)" },
      { status: 400 }
    );
  }

  const result = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(doctorWallets)
      .where(eq(doctorWallets.doctorId, doctor.id))
      .limit(1)
      .for("update");

    if (!wallet) {
      return { error: "Portefeuille introuvable", status: 404 };
    }

    if (amount > wallet.balance) {
      return {
        error: `Solde insuffisant. Solde disponible : ${wallet.balance} millimes`,
        status: 422,
      };
    }

    const newBalance = wallet.balance - amount;
    const newTotalWithdrawn = wallet.totalWithdrawn + amount;

    await tx
      .update(doctorWallets)
      .set({
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn,
        updatedAt: new Date(),
      })
      .where(eq(doctorWallets.doctorId, doctor.id));

    const [transaction] = await tx
      .insert(walletTransactions)
      .values({
        doctorId: doctor.id,
        type: "withdrawal",
        amount: -amount,
        description: "Demande de retrait",
      })
      .returning();

    return { transaction, newBalance };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number });
  }

  return NextResponse.json(result, { status: 201 });
}
