"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface Transaction {
  id: string;
  type: "credit" | "commission" | "withdrawal" | "refund";
  amountMillimes: number;
  description: string;
  createdAt: string;
}

interface WalletClientProps {
  balanceMillimes: number;
  totalEarnedMillimes: number;
  totalCommissionMillimes: number;
  totalWithdrawnMillimes: number;
  transactions: Transaction[];
  hasMore: boolean;
}

const TYPE_BADGE_CLASS: Record<Transaction["type"], string> = {
  credit: "bg-green-100 text-green-700",
  commission: "bg-orange-100 text-orange-700",
  withdrawal: "bg-blue-100 text-blue-700",
  refund: "bg-red-100 text-red-700",
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toFixed(3) + " DT";
}

export function WalletClient({
  balanceMillimes,
  totalEarnedMillimes,
  totalCommissionMillimes,
  totalWithdrawnMillimes,
  transactions: initialTransactions,
  hasMore: initialHasMore,
}: WalletClientProps) {
  const t = useTranslations("medecin.wallet");
  const tCommon = useTranslations("medecin.common");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(initialTransactions.length);

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const res = await fetch(`/api/doctor/wallet?offset=${offset}&limit=50`);
    if (res.ok) {
      const data = (await res.json()) as { transactions: Transaction[]; hasMore: boolean };
      setTransactions((prev) => [...prev, ...data.transactions]);
      setHasMore(data.hasMore);
      setOffset((prev) => prev + data.transactions.length);
    }
    setLoadingMore(false);
  }

  async function handleWithdraw() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setWithdrawError(t("withdrawInvalid"));
      return;
    }
    const amountInMillimes = Math.round(parsed * 1000);
    if (amountInMillimes > balanceMillimes) {
      setWithdrawError(t("withdrawExceedsBalance"));
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);

    const res = await fetch("/api/doctor/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountInMillimes }),
    });

    setWithdrawing(false);

    if (res.ok) {
      setWithdrawSuccess(true);
      setModalOpen(false);
      setAmount("");
    } else {
      const data = await res.json().catch(() => ({}));
      setWithdrawError(data.error ?? t("withdrawError"));
    }
  }

  return (
    <div className="space-y-6">
      {withdrawSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {t("withdrawSuccess")}
        </div>
      )}

      {/* Balance + stats */}
      <div className="space-y-4">
        {/* Main balance card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm uppercase tracking-wide">{t("balance")}</p>
            <p className="text-4xl font-bold mt-1">{formatDT(balanceMillimes)}</p>
          </div>
          <Button
            onClick={() => {
              setWithdrawSuccess(false);
              setWithdrawError(null);
              setModalOpen(true);
            }}
            className="bg-white text-purple-700 hover:bg-white/90 font-semibold shrink-0"
            disabled={balanceMillimes <= 0}
          >
            {t("withdraw")}
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="text-xs text-gray-500 uppercase">{t("earned")}</div>
            <div className="text-2xl font-bold mt-1 text-green-700">
              {formatDT(totalEarnedMillimes)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="text-xs text-gray-500 uppercase">{t("commission")}</div>
            <div className="text-2xl font-bold mt-1 text-orange-600">
              {formatDT(totalCommissionMillimes)}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="text-xs text-gray-500 uppercase">{t("withdrawn")}</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">
              {formatDT(totalWithdrawnMillimes)}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">{t("transactions")}</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">{t("noTransactions")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colDate")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colType")}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colAmount")}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("colDescription")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => {
                    const typeLabels: Record<Transaction["type"], string> = {
                      credit: t("typeCredit"),
                      commission: t("typeCommission"),
                      withdrawal: t("typeWithdrawal"),
                      refund: t("typeRefund"),
                    };
                    const badgeClass = TYPE_BADGE_CLASS[tx.type] ?? "bg-gray-100 text-gray-600";
                    const badgeLabel = typeLabels[tx.type] ?? tx.type;
                    const isDebit = tx.type === "commission" || tx.type === "withdrawal";
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {format(new Date(tx.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium tabular-nums ${
                            isDebit ? "text-red-600" : "text-green-700"
                          }`}
                        >
                          {isDebit ? "-" : "+"}{formatDT(tx.amountMillimes)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                          {tx.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="p-4 border-t text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("loading") : t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Withdrawal modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("withdrawTitle")}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                aria-label={t("withdrawConfirm")}
              >
                ×
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">
                {t("balance")} : <span className="font-semibold">{formatDT(balanceMillimes)}</span>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="withdraw-amount">
                {t("withdrawAmount")}
              </label>
              <Input
                id="withdraw-amount"
                type="number"
                min="0.001"
                step="0.001"
                max={(balanceMillimes / 1000).toString()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${(balanceMillimes / 1000).toFixed(3)}`}
              />
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              {t("withdrawNote")}
            </div>

            {withdrawError && (
              <p className="text-sm text-red-600">{withdrawError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={withdrawing}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || !amount}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {withdrawing ? t("withdrawProcessing") : t("withdrawConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
