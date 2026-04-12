import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { WalletClient } from "./wallet-client";

const PAGE_SIZE = 50;

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const doctorId = session.user.id;

  const [walletRow, txRows, statsRow] = await Promise.all([
    db.execute(
      sql`SELECT balance FROM doctor_wallets WHERE doctor_id = ${doctorId} LIMIT 1`
    ),
    db.execute(
      sql`
        SELECT id, type, amount_millimes AS "amountMillimes", description, created_at AS "createdAt"
        FROM wallet_transactions
        WHERE doctor_id = ${doctorId}
        ORDER BY created_at DESC
        LIMIT ${PAGE_SIZE + 1}
      `
    ),
    db.execute(
      sql`
        SELECT
          COALESCE(SUM(amount_millimes) FILTER (WHERE type = 'credit'), 0)     AS total_earned,
          COALESCE(SUM(amount_millimes) FILTER (WHERE type = 'commission'), 0)  AS total_commission,
          COALESCE(SUM(amount_millimes) FILTER (WHERE type = 'withdrawal'), 0)  AS total_withdrawn
        FROM wallet_transactions
        WHERE doctor_id = ${doctorId}
      `
    ),
  ]);

  const balanceMillimes = Number(
    ((walletRow as unknown as Array<{ balance: number | null }>)[0])?.balance ?? 0
  );

  const allTxs = (txRows as unknown as Array<{
    id: string;
    type: "credit" | "commission" | "withdrawal" | "refund";
    amountMillimes: number;
    description: string;
    createdAt: string;
  }>);

  const hasMore = allTxs.length > PAGE_SIZE;
  const transactions = hasMore ? allTxs.slice(0, PAGE_SIZE) : allTxs;

  const stats = ((statsRow as unknown as Array<{
    total_earned: number;
    total_commission: number;
    total_withdrawn: number;
  }>)[0]) ?? { total_earned: 0, total_commission: 0, total_withdrawn: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portefeuille</h1>
        <p className="text-gray-500 text-sm mt-1">
          Consultez vos revenus de téléconsultation et gérez vos retraits.
        </p>
      </div>

      <WalletClient
        balanceMillimes={balanceMillimes}
        totalEarnedMillimes={Number(stats.total_earned)}
        totalCommissionMillimes={Number(stats.total_commission)}
        totalWithdrawnMillimes={Number(stats.total_withdrawn)}
        transactions={transactions}
        hasMore={hasMore}
      />
    </div>
  );
}
