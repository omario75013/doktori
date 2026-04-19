"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import {
  Wallet,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Banknote,
  X,
  Info,
  Download,
  Filter,
  Search,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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

const TYPE_CONFIG: Record<
  Transaction["type"],
  { badge: string; icon: React.ElementType; sign: string; color: string }
> = {
  credit: {
    badge: "bg-green-50 text-green-700 border-green-200",
    icon: ArrowDownRight,
    sign: "+",
    color: "text-green-700",
  },
  commission: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: BadgePercent,
    sign: "-",
    color: "text-amber-600",
  },
  withdrawal: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: ArrowUpRight,
    sign: "-",
    color: "text-blue-600",
  },
  refund: {
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: RefreshCw,
    sign: "-",
    color: "text-red-600",
  },
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toFixed(3) + " DT";
}

function formatDTShort(millimes: number): string {
  const val = millimes / 1000;
  if (val >= 1000) return (val / 1000).toFixed(1) + "k DT";
  return val.toFixed(val < 10 ? 3 : 0) + " DT";
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
  const [filterType, setFilterType] = useState<Transaction["type"] | "all">("all");

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

  const filteredTransactions =
    filterType === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === filterType);

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {withdrawSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("withdrawSuccess")}
        </div>
      )}

      {/* ── Balance card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground via-[#0e3d38] to-primary p-6 sm:p-8 text-white shadow-xl">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-teal-200" />
              <p className="text-teal-200 text-sm font-medium uppercase tracking-wider">
                {t("balance")}
              </p>
            </div>
            <p className="text-4xl sm:text-5xl font-black tracking-tight">
              {formatDT(balanceMillimes)}
            </p>
            <p className="text-teal-300/60 text-xs mt-2">
              Solde disponible pour retrait
            </p>
          </div>
          <Button
            onClick={() => {
              setWithdrawSuccess(false);
              setWithdrawError(null);
              setModalOpen(true);
            }}
            className="bg-white text-foreground hover:bg-white/90 font-bold shrink-0 rounded-xl px-6 py-5 text-sm shadow-lg"
            disabled={balanceMillimes <= 0}
          >
            <Banknote className="mr-2 h-4 w-4" />
            {t("withdraw")}
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-green-100 bg-white p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              {t("earned")}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatDTShort(totalEarnedMillimes)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Revenus téléconsultations + SOS
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <BadgePercent className="h-4 w-4" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              {t("commission")}
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatDTShort(totalCommissionMillimes)}</p>
          <p className="text-xs text-gray-400 mt-1">
            15% téléconsult · 10% SOS
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              {t("withdrawn")}
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatDTShort(totalWithdrawnMillimes)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Total retiré vers votre compte
          </p>
        </div>
      </div>

      {/* ── How it works info ── */}
      <div className="rounded-2xl border border-border bg-secondary p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-foreground space-y-1.5">
            <p className="font-semibold">Comment fonctionne votre portefeuille ?</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>Le patient paie la <strong>téléconsultation</strong> ou l&apos;intervention <strong>SOS</strong> via Flouci.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>Doktori prélève une commission (<strong>15%</strong> téléconsult, <strong>10%</strong> SOS) et crédite le reste sur votre portefeuille.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <span>Vous pouvez demander un <strong>retrait à tout moment</strong>. Le virement est effectué sous 3-5 jours ouvrés.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Transaction history ── */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-foreground">{t("transactions")}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            {(["all", "credit", "commission", "withdrawal", "refund"] as const).map((type) => {
              const labels: Record<string, string> = {
                all: "Tout",
                credit: "Crédits",
                commission: "Commissions",
                withdrawal: "Retraits",
                refund: "Remboursements",
              };
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filterType === type
                      ? "bg-foreground text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
              <Wallet className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{t("noTransactions")}</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards. Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t("colDate")}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t("colType")}
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t("colAmount")}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t("colDescription")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTransactions.map((tx) => {
                    const config = TYPE_CONFIG[tx.type];
                    const TypeIcon = config.icon;
                    const typeLabels: Record<Transaction["type"], string> = {
                      credit: t("typeCredit"),
                      commission: t("typeCommission"),
                      withdrawal: t("typeWithdrawal"),
                      refund: t("typeRefund"),
                    };
                    const isDebit = tx.type === "commission" || tx.type === "withdrawal";
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                          {format(new Date(tx.createdAt), "d MMM yyyy · HH:mm", { locale: fr })}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-semibold ${config.badge}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {typeLabels[tx.type]}
                          </span>
                        </td>
                        <td
                          className={`px-5 py-4 text-right font-bold tabular-nums ${config.color}`}
                        >
                          {config.sign}
                          {formatDT(tx.amountMillimes)}
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-xs truncate text-xs">
                          {tx.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filteredTransactions.map((tx) => {
                const config = TYPE_CONFIG[tx.type];
                const TypeIcon = config.icon;
                const typeLabels: Record<Transaction["type"], string> = {
                  credit: t("typeCredit"),
                  commission: t("typeCommission"),
                  withdrawal: t("typeWithdrawal"),
                  refund: t("typeRefund"),
                };
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${config.badge}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {typeLabels[tx.type]}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {tx.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${config.color}`}>
                        {config.sign}{formatDT(tx.amountMillimes)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(tx.createdAt), "d MMM", { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="p-4 border-t border-gray-50 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {t("loading")}
                    </>
                  ) : (
                    t("loadMore")
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Withdrawal modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t("withdrawTitle")}</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Balance reminder */}
            <div className="rounded-xl bg-secondary border border-border p-4">
              <p className="text-xs text-gray-500 mb-0.5">Solde disponible</p>
              <p className="text-2xl font-bold text-foreground">{formatDT(balanceMillimes)}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="withdraw-amount">
                {t("withdrawAmount")}
              </label>
              <div className="relative">
                <Input
                  id="withdraw-amount"
                  type="number"
                  min="0.001"
                  step="0.001"
                  max={(balanceMillimes / 1000).toString()}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max: ${(balanceMillimes / 1000).toFixed(3)} DT`}
                  className="rounded-xl pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                  DT
                </span>
              </div>
              {/* Quick amount buttons */}
              <div className="flex gap-2 mt-2">
                {[25, 50, 100].map((pct) => {
                  const val = ((balanceMillimes / 1000) * pct) / 100;
                  if (val <= 0) return null;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAmount(val.toFixed(3))}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {pct}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setAmount((balanceMillimes / 1000).toFixed(3))}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  Tout
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
              <span>{t("withdrawNote")}</span>
            </div>

            {withdrawError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {withdrawError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={withdrawing}
                className="rounded-xl"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || !amount}
                className="rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold shadow-sm"
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
