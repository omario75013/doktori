"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Save, UserCog } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  yearsOfExperience: number | null;
  hireDate: string | null;
  photoUrl: string | null;
  bio: string | null;
};

export default function SecretaryProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/secretary/profile");
        if (!res.ok) throw new Error("Erreur");
        const data: Profile = await res.json();
        setProfile(data);
        setForm({
          name: data.name,
          phone: data.phone ?? "",
          bio: data.bio ?? "",
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/secretary/profile/photo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setProfile((p) => (p ? { ...p, photoUrl: data.photoUrl } : p));
      toast.success("Photo mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/secretary/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() === "" ? null : form.phone.trim(),
          bio: form.bio.trim() === "" ? null : form.bio.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil mis à jour");
    } catch {
      toast.error("Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!profile) return <p className="text-sm text-red-600">Profil introuvable</p>;

  const initials = profile.name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations personnelles</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-white shadow-sm p-5 flex items-center gap-5">
        <div className="relative">
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={profile.name}
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-white shadow flex items-center justify-center hover:opacity-90 disabled:opacity-60"
            aria-label="Changer la photo"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-lg">{profile.name}</p>
          <p className="text-sm text-gray-500">{profile.email}</p>
          {profile.hireDate && (
            <p className="text-xs text-gray-400 mt-1">
              En poste depuis le {new Date(profile.hireDate).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      </section>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-white shadow-sm p-5 space-y-4"
      >
        <h2 className="font-semibold text-foreground">Informations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Nom complet</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Téléphone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">À propos</span>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Brève présentation, parcours…"
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </label>
        <p className="text-xs text-gray-400">
          Les champs <span className="font-medium">email, date de naissance, expérience, salaire</span>{" "}
          et <span className="font-medium">permissions</span> sont gérés par le médecin.
        </p>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
