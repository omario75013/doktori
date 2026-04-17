"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

type Secretary = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function SecretairesPage() {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSecretaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/secretaries");
      if (res.ok) {
        const data = await res.json();
        setSecretaries(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecretaries();
  }, [loadSecretaries]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/secretaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        return;
      }

      setSuccess(`Secrétaire "${data.name}" ajoutée avec succès`);
      setName("");
      setEmail("");
      setPassword("");
      await loadSecretaries();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`/api/secretaries/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadSecretaries();
      }
    } finally {
      setRemoving(null);
    }
  }

  const active = secretaries.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <UserPlus className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold text-[#134E4A]">Gestion des secrétaires</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add secretary form */}
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#134E4A] mb-4">Ajouter une secrétaire</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sec-name" className="text-[#134E4A] font-medium">Nom complet</Label>
              <Input
                id="sec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Fatma Ben Ali"
                required
                disabled={adding}
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-email" className="text-[#134E4A] font-medium">Email</Label>
              <Input
                id="sec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: fatma@clinique.tn"
                required
                disabled={adding}
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-password" className="text-[#134E4A] font-medium">Mot de passe</Label>
              <Input
                id="sec-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                minLength={8}
                required
                disabled={adding}
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-[#0891B2] bg-[#F0FDFA] border border-[#E6F4F1] rounded-xl px-3 py-2">{success}</p>
            )}

            <Button
              type="submit"
              disabled={adding}
              className="w-full bg-[#0891B2] hover:bg-[#0E7490] h-12 rounded-xl font-bold text-white"
            >
              {adding ? "Ajout en cours…" : "Ajouter la secrétaire"}
            </Button>
          </form>
        </div>

        {/* Secretary list */}
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#134E4A]">Secrétaires actives</h2>
            {active.length > 0 && (
              <span className="text-xs text-[#0891B2] font-semibold bg-[#F0FDFA] px-2.5 py-1 rounded-full">
                {active.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-[#F0FDFA] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="py-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-3">
                <UserPlus className="h-6 w-6 text-[#0891B2]" />
              </div>
              <p className="text-sm text-gray-400">
                Aucune secrétaire configurée pour le moment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E6F4F1]">
              {active.map((sec) => (
                <div
                  key={sec.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[#F0FDFA] -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[#134E4A]">{sec.name}</p>
                    <p className="text-xs text-gray-500">{sec.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removing === sec.id}
                    onClick={() => handleRemove(sec.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl shrink-0"
                  >
                    {removing === sec.id ? "Suppression…" : "Retirer"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Les secrétaires peuvent consulter et gérer l&apos;agenda, mais n&apos;ont pas accès aux
        paramètres financiers ni aux réglages du compte.
      </p>
    </div>
  );
}
