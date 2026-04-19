"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SPECIALTIES } from "@doktori/shared";
import {
  FileText,
  Receipt,
  ClipboardList,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

interface Prescription {
  prescriptionId: string;
  createdAt: string;
  doctorName: string;
  specialty: string;
  startsAt: string;
  type: string;
}

interface CnamClaim {
  id: string;
  cnamNumber: string;
  amount: number;
  status: string;
  consultationDate: string;
  doctorName: string;
}

interface ConsultationNote {
  id: string;
  assessment: string | null;
  plan: string | null;
  createdAt: string;
  doctorName: string;
  startsAt: string;
  type: string;
}

interface Documents {
  prescriptions: Prescription[];
  cnamClaims: CnamClaim[];
  consultationNotes: ConsultationNote[];
}

type ActiveTab = "ordonnances" | "cnam" | "comptes-rendus";

const CNAM_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  reimbursed: "Remboursé",
  rejected: "Rejeté",
};

const CNAM_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  reimbursed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

function formatMillimes(amount: number): string {
  return `${(amount / 1000).toFixed(3)} DT`;
}

export default function MesDocumentsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Documents | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("ordonnances");

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/patients/me/documents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, router]);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: "ordonnances",
      label: "Ordonnances",
      icon: <FileText className="h-4 w-4" />,
      count: documents?.prescriptions.length ?? 0,
    },
    {
      id: "cnam",
      label: "Bordereaux CNAM",
      icon: <Receipt className="h-4 w-4" />,
      count: documents?.cnamClaims.length ?? 0,
    },
    {
      id: "comptes-rendus",
      label: "Comptes-rendus",
      icon: <ClipboardList className="h-4 w-4" />,
      count: documents?.consultationNotes.length ?? 0,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-foreground/60 text-sm">Chargement de vos documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <FileText className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Mes documents</h1>
              <p className="text-white/70 text-xs mt-0.5">
                Ordonnances, bordereaux CNAM et comptes-rendus
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-border p-1 mb-6 shadow-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground/60 hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? "bg-white/30 text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Ordonnances */}
        {activeTab === "ordonnances" && (
          <section className="space-y-3">
            {!documents?.prescriptions.length ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-primary/40" />}
                title="Aucune ordonnance"
                description="Vos ordonnances apparaîtront ici après vos consultations"
              />
            ) : (
              documents.prescriptions.map((p) => {
                const spec = SPECIALTIES.find((s) => s.id === p.specialty);
                return (
                  <a
                    key={p.prescriptionId}
                    href={`/ordonnance/${p.prescriptionId}`}
                    className="block bg-white rounded-2xl border border-border border-l-4 border-l-primary shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{p.doctorName}</p>
                            <p className="text-xs text-foreground/50">{spec?.label ?? p.specialty}</p>
                          </div>
                        </div>
                        <p className="text-xs text-foreground/40 mt-2 capitalize">
                          {format(new Date(p.createdAt), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary flex-shrink-0">
                        <span className="text-xs font-semibold">Voir</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </section>
        )}

        {/* CNAM claims */}
        {activeTab === "cnam" && (
          <section className="space-y-3">
            {!documents?.cnamClaims.length ? (
              <EmptyState
                icon={<Receipt className="h-8 w-8 text-primary/40" />}
                title="Aucun bordereau CNAM"
                description="Vos bordereaux de remboursement CNAM apparaîtront ici"
              />
            ) : (
              documents.cnamClaims.map((c) => {
                const statusLabel = CNAM_STATUS_LABELS[c.status] ?? c.status;
                const statusColor = CNAM_STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-border border-l-4 border-l-teal-500 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Receipt className="h-4 w-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{c.doctorName}</p>
                            <p className="text-xs text-foreground/50 font-mono">{c.cnamNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {formatMillimes(c.amount)}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <span className="text-xs text-foreground/40 capitalize">
                            {format(new Date(c.consultationDate), "d MMMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* Consultation notes */}
        {activeTab === "comptes-rendus" && (
          <section className="space-y-3">
            {!documents?.consultationNotes.length ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8 text-primary/40" />}
                title="Aucun compte-rendu"
                description="Vos comptes-rendus de consultation apparaîtront ici"
              />
            ) : (
              documents.consultationNotes.map((n) => (
                <div
                  key={n.id}
                  className="bg-white rounded-2xl border border-border border-l-4 border-l-purple-500 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{n.doctorName}</p>
                          <p className="text-xs text-foreground/40 capitalize">
                            {format(new Date(n.startsAt), "d MMMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      {n.assessment && (
                        <p className="text-xs text-foreground/70 line-clamp-2 mt-1 bg-secondary rounded-lg px-3 py-2">
                          {n.assessment}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-foreground/30 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-4">
        {icon}
      </div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-sm text-foreground/50">{description}</p>
    </div>
  );
}
