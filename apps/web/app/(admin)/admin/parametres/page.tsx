import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { db, platformSettings } from "@doktori/db";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import Link from "next/link";
import { ChevronRight, CreditCard, ImageIcon, Sparkles } from "lucide-react";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

const SUB_PAGES = [
  {
    href: "/admin/parametres/paiement",
    icon: CreditCard,
    title: "Paiement",
    description:
      "Stripe, virement bancaire, espèces — toggles + commissions plateforme.",
  },
  {
    href: "/admin/parametres/coach-ia",
    icon: Sparkles,
    title: "Coach IA",
    description:
      "Activation, limites par patient/global, plafond coût, texte du disclaimer.",
  },
  {
    href: "/admin/parametres/visuels",
    icon: ImageIcon,
    title: "Visuels homepage",
    description:
      "Image hero, illustrations « Comment ça marche », témoignages patients.",
  },
];

export default async function AdminParametresPage() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) redirect("/admin");

  const rows = await db.select().from(platformSettings).orderBy(asc(platformSettings.category), asc(platformSettings.key));

  // Mask secrets before passing to client
  const masked = rows.map((row) => ({
    ...row,
    value: row.type === "secret" ? maskSecret(row.value) : row.value,
    options: row.options as string[] | null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  // Group by category
  const grouped: Record<string, typeof masked> = {};
  for (const row of masked) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Paramètres de la plateforme</h1>
        <p className="text-slate-500 mt-1">
          Configuration globale — modifications appliquées immédiatement
        </p>
      </div>

      {/* Sub-pages — features with their own dedicated config UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {SUB_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <p.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{p.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-teal-600" />
          </Link>
        ))}
      </div>

      <SettingsPanel settings={grouped} />
    </div>
  );
}

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••••••${value.slice(-4)}`;
}
