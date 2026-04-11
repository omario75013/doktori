"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestion des secrétaires</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Add secretary form */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold mb-4">Ajouter une secrétaire</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sec-name">Nom complet</Label>
              <Input
                id="sec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Fatma Ben Ali"
                required
                disabled={adding}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-email">Email</Label>
              <Input
                id="sec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: fatma@clinique.tn"
                required
                disabled={adding}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-password">Mot de passe</Label>
              <Input
                id="sec-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                minLength={8}
                required
                disabled={adding}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">{success}</p>
            )}

            <Button type="submit" disabled={adding} className="w-full">
              {adding ? "Ajout en cours…" : "Ajouter la secrétaire"}
            </Button>
          </form>
        </div>

        {/* Secretary list */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-base font-semibold mb-4">
            Secrétaires actives{" "}
            <span className="text-gray-400 font-normal text-sm">({active.length})</span>
          </h2>

          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucune secrétaire configurée pour le moment.
            </p>
          ) : (
            <div className="divide-y">
              {active.map((sec) => (
                <div
                  key={sec.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium">{sec.name}</p>
                    <p className="text-xs text-gray-500">{sec.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removing === sec.id}
                    onClick={() => handleRemove(sec.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
                  >
                    {removing === sec.id ? "Suppression…" : "Retirer"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Les secrétaires peuvent consulter et gérer l&apos;agenda, mais n&apos;ont pas accès aux
        paramètres financiers ni aux réglages du compte.
      </p>
    </div>
  );
}
