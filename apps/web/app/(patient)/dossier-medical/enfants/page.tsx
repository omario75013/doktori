"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Baby, ChevronRight, Loader2, Syringe } from "lucide-react";

interface Dependent {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  relation: string | null;
}

function ageInMonths(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

export default function CarnetEnfantsPage() {
  const router = useRouter();
  const t = useTranslations("patient.dossier.enfants");
  const tc = useTranslations("patient.dossier.common");
  function formatAge(months: number): string {
    if (months < 1) return t("ageLess1");
    if (months < 24) return t("ageMonths", { months });
    const years = Math.floor(months / 12);
    return t("ageYears", { years });
  }
  const [token, setToken] = useState<string | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.push("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token]);

  async function load(t: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/me/dependents", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        const all: Dependent[] = data.items ?? data.dependents ?? [];
        const children = all.filter((d) => {
          if (!d.dateOfBirth) return false;
          const months = ageInMonths(d.dateOfBirth);
          return months < 12 * 18;
        });
        setDependents(children);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <a
          href="/dossier-medical"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--ink-500)] hover:text-[color:var(--primary-600)] mb-2"
        >
          ← {tc("backToDossier")}
        </a>
        <div className="ds-eyebrow">{tc("eyebrow")}</div>
        <h1 className="ds-page-title flex items-center gap-2">
          <Baby className="w-6 h-6 text-[color:var(--primary-600)]" /> {t("title")}
        </h1>
        <p className="ds-page-sub">{t("subtitle")}</p>
      </div>

      <div>

        {dependents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
            <p className="text-foreground font-semibold mb-2">{t("empty.title")}</p>
            <p className="text-sm text-muted-foreground mb-4">{t("empty.subtitle")}</p>
            <Link
              href="/ma-famille"
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold"
            >
              {t("manageFamily")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {dependents.map((dep) => {
              const months = dep.dateOfBirth ? ageInMonths(dep.dateOfBirth) : null;
              return (
                <Link
                  key={dep.id}
                  href={`/dossier-medical/enfants/${dep.id}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {dep.gender === "M" ? "👦" : dep.gender === "F" ? "👧" : "🧒"}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{dep.name}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                      {months !== null && <span>{formatAge(months)}</span>}
                      {dep.relation && <span>· {dep.relation}</span>}
                    </p>
                  </div>
                  <Syringe className="w-4 h-4 text-muted-foreground" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
