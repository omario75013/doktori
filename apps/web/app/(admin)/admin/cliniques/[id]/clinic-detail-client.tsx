"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, UserPlus, ShieldCheck, User } from "lucide-react";

interface ClinicDoctor {
  id: string;
  role: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  doctorSpecialty: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

export function ClinicDetailClient({
  clinicId,
  initialDoctors,
}: {
  clinicId: string;
  initialDoctors: ClinicDoctor[];
}) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<ClinicDoctor[]>(initialDoctors);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // Doctor search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState<"member" | "admin">("member");

  async function searchDoctors(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/doctors?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json() as { doctors: SearchResult[] };
        // Exclude already-added doctors
        const existingIds = new Set(doctors.map((d) => d.doctorId));
        setSearchResults(data.doctors.filter((d: SearchResult) => !existingIds.has(d.id)));
      }
    } finally {
      setSearching(false);
    }
  }

  async function addDoctor(doctorId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/clinics/${clinicId}/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, role: addRole }),
      });
      if (res.ok) {
        setSearchQuery("");
        setSearchResults([]);
        startTransition(() => router.refresh());
        // Optimistically refresh data via page reload
        const fresh = await fetch(`/api/admin/clinics/${clinicId}`);
        if (fresh.ok) {
          const data = await fresh.json() as { doctors: ClinicDoctor[] };
          setDoctors(data.doctors);
        }
      } else {
        const err = await res.json() as { error: string };
        alert(err.error ?? "Erreur");
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeDoctor(doctorId: string, doctorName: string) {
    if (!confirm(`Retirer ${doctorName} de la clinique ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/clinics/${clinicId}/doctors/${doctorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDoctors((prev) => prev.filter((d) => d.doctorId !== doctorId));
        startTransition(() => router.refresh());
      } else {
        alert("Erreur lors du retrait");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Doctors list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Médecins ({doctors.length})
          </h2>
        </div>
        {doctors.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500 text-center">
            Aucun médecin dans cette clinique
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {doctors.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-center text-sm font-bold">
                    {d.doctorName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{d.doctorName}</div>
                    <div className="text-xs text-slate-500 capitalize">
                      {d.doctorSpecialty} · {d.doctorEmail}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      d.role === "admin"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {d.role === "admin" ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {d.role === "admin" ? "Admin" : "Membre"}
                  </span>
                  <button
                    onClick={() => removeDoctor(d.doctorId, d.doctorName)}
                    disabled={busy}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add doctor */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Ajouter un médecin
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => searchDoctors(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as "member" | "admin")}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {searching && (
          <p className="mt-2 text-xs text-slate-500">Recherche en cours...</p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {searchResults.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{d.name}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {d.specialty} · {d.email}
                  </div>
                </div>
                <button
                  onClick={() => addDoctor(d.id)}
                  disabled={busy}
                  className="px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">Aucun médecin trouvé</p>
        )}
      </div>
    </div>
  );
}
