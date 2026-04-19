"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Image,
  Save,
  UserMinus,
  UserPlus,
  Loader2,
  AlertCircle,
  Users,
  Shield,
  BadgeCheck,
} from "lucide-react";
import { SPECIALTIES } from "@doktori/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicProfile {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  plan: string;
}

interface ClinicDoctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  photoUrl: string | null;
  role: string;
  joinedAt: string;
}

interface ClinicSecretary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Gratuit", color: "bg-gray-100 text-gray-600" },
  starter: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  pro: { label: "Pro", color: "bg-primary/10 text-primary" },
  enterprise: { label: "Entreprise", color: "bg-purple-100 text-purple-700" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Responsable",
  member: "Membre",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-6">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="font-heading text-base font-bold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CliniqueParametresPage() {
  // Profile state
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    logoUrl: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  // Inline validation errors for profile form
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({});

  // Doctors state
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  // Inline validation error for invite form
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Secretaries state
  const [secretaries, setSecretaries] = useState<ClinicSecretary[]>([]);

  const [loading, setLoading] = useState(true);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [profileRes, doctorsRes, secretairesRes] = await Promise.all([
          fetch("/api/clinique/profile"),
          fetch("/api/clinique/doctors"),
          fetch("/api/clinique/secretaires"),
        ]);

        if (profileRes.ok) {
          const data: ClinicProfile = await profileRes.json();
          setProfile(data);
          setProfileForm({
            name: data.name,
            address: data.address,
            city: data.city,
            phone: data.phone,
            logoUrl: data.logoUrl ?? "",
          });
        }

        if (doctorsRes.ok) {
          const data: { doctors: ClinicDoctor[] } = await doctorsRes.json();
          setDoctors(data.doctors);
        }

        if (secretairesRes.ok) {
          const data: { secretaries: ClinicSecretary[] } = await secretairesRes.json();
          setSecretaries(data.secretaries);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ── Save profile ─────────────────────────────────────────────────────────────
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();

    // Inline validation
    const errors: { name?: string; phone?: string } = {};
    if (!profileForm.name.trim()) errors.name = "Le nom de l'établissement est requis.";
    if (profileForm.phone && !/^[0-9\s\+\-\(\)]{6,20}$/.test(profileForm.phone.trim())) {
      errors.phone = "Numéro de téléphone invalide.";
    }
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProfileSaving(true);
    try {
      const res = await fetch("/api/clinique/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        toast.success("Profil mis à jour avec succès.");
        setProfile((prev) => prev ? { ...prev, ...profileForm } : prev);
      } else {
        const data: { error: string } = await res.json();
        toast.error(data.error ?? "Erreur lors de la mise à jour.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Invite / add doctor ──────────────────────────────────────────────────────
  async function handleInviteDoctor(e: React.FormEvent) {
    e.preventDefault();

    // Inline validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteEmail.trim()) {
      setInviteEmailError("L'adresse email est requise.");
      return;
    }
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteEmailError("Adresse email invalide.");
      return;
    }
    setInviteEmailError(null);

    setInviting(true);
    try {
      const res = await fetch("/api/clinique/invite-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data: {
        status?: "added" | "invited";
        error?: string;
        doctor?: { id: string; name: string };
        email?: string;
      } = await res.json();

      if (res.ok && data.status === "added") {
        toast.success(`${data.doctor?.name ?? "Médecin"} ajouté à la clinique.`);
        setInviteEmail("");
        // Reload doctors list
        const dr = await fetch("/api/clinique/doctors");
        if (dr.ok) {
          const updated: { doctors: ClinicDoctor[] } = await dr.json();
          setDoctors(updated.doctors);
        }
      } else if (res.ok && data.status === "invited") {
        toast.success(`Invitation envoyée à ${data.email ?? inviteEmail.trim()}`);
        setInviteEmail("");
      } else {
        toast.error(data.error ?? "Impossible d'ajouter ce médecin.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setInviting(false);
    }
  }

  // ── Remove doctor ────────────────────────────────────────────────────────────
  async function handleRemoveDoctor(doctorId: string, doctorName: string) {
    if (!confirm(`Retirer ${doctorName} de la clinique ?`)) return;
    setRemovingId(doctorId);
    try {
      const res = await fetch(`/api/clinique/doctors/${doctorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
        toast.success(`${doctorName} a été retiré de la clinique.`);
      } else {
        toast.error("Impossible de retirer ce médecin. Réessayez.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setRemovingId(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-black text-foreground">Paramètres</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez le profil et les accès de votre établissement.
          </p>
        </div>
        {profile && (
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              PLAN_LABELS[profile.plan]?.color ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {PLAN_LABELS[profile.plan]?.label ?? profile.plan}
          </div>
        )}
      </div>

      {/* ── Profile section ── */}
      <Section
        title="Profil de l'établissement"
        description="Ces informations sont visibles sur votre fiche publique."
      >
        <form onSubmit={handleProfileSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              Nom de l&apos;établissement
            </label>
            <div className={`flex h-11 items-center rounded-xl border-2 px-3 focus-within:border-primary ${profileErrors.name ? "border-red-400" : "border-border"}`}>
              <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, name: e.target.value });
                  if (profileErrors.name) setProfileErrors({ ...profileErrors, name: undefined });
                }}
                required
                className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            {profileErrors.name && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                {profileErrors.name}
              </p>
            )}
          </div>

          {/* Address + City */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                Adresse
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                Ville
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              Téléphone
            </label>
            <div className={`flex h-11 items-center rounded-xl border-2 px-3 focus-within:border-primary ${profileErrors.phone ? "border-red-400" : "border-border"}`}>
              <Phone className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, phone: e.target.value });
                  if (profileErrors.phone) setProfileErrors({ ...profileErrors, phone: undefined });
                }}
                className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            {profileErrors.phone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                {profileErrors.phone}
              </p>
            )}
          </div>

          {/* Email (read-only — used for login) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              Email de connexion
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-border bg-gray-50 px-3">
              <Mail className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-muted-foreground">{profile?.email}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pour modifier l&apos;email, contactez le support.
            </p>
          </div>

          {/* Logo URL */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              URL du logo
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-primary">
              <Image className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="url"
                value={profileForm.logoUrl}
                onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                placeholder="https://..."
                className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-all hover:bg-doktori-teal-dark disabled:opacity-60"
          >
            {profileSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <Save className="h-4 w-4" strokeWidth={2.5} />
            )}
            Enregistrer
          </button>
        </form>
      </Section>

      {/* ── Doctors section ── */}
      <Section
        title="Médecins de la clinique"
        description="Gérez les praticiens associés à votre établissement."
      >
        {/* Doctor list */}
        <div className="mb-6 space-y-2">
          {doctors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-muted-foreground">
                Aucun médecin associé pour le moment.
              </p>
            </div>
          ) : (
            doctors.map((doc) => {
              const spec = SPECIALTIES.find((s) => s.id === doc.specialty);
              const initials = doc.name
                .replace(/^Dr\.?\s*/i, "")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {doc.photoUrl ? (
                        <div className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.photoUrl}
                            alt={doc.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xs font-black text-white">
                          {initials}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-white">
                        <BadgeCheck className="h-3.5 w-3.5 fill-accent text-white" strokeWidth={2.5} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{spec?.label ?? doc.specialty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ROLE_LABELS[doc.role] ?? doc.role}
                    </span>
                    <button
                      onClick={() => handleRemoveDoctor(doc.id, doc.name)}
                      disabled={removingId === doc.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                      title="Retirer"
                    >
                      {removingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <UserMinus className="h-4 w-4" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Invite / add form */}
        <div className="rounded-xl bg-secondary p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
            Ajouter ou inviter un médecin
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Si le médecin n&apos;a pas encore de compte Doktori, il recevra un email d&apos;invitation.
          </p>
          <form onSubmit={handleInviteDoctor} className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className={`flex h-11 flex-1 items-center rounded-xl border-2 bg-white px-3 focus-within:border-primary ${inviteEmailError ? "border-red-400" : "border-border"}`}>
                  <Mail className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteEmailError) setInviteEmailError(null);
                    }}
                    placeholder="email@medecin.tn"
                    className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  className="h-11 rounded-xl border-2 border-border bg-white px-3 text-sm font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="member">Membre</option>
                  <option value="admin">Responsable</option>
                </select>
              </div>
              {inviteEmailError && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  {inviteEmailError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all hover:bg-doktori-teal-dark disabled:opacity-60"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              ) : (
                <UserPlus className="h-4 w-4" strokeWidth={2.5} />
              )}
              Ajouter ou inviter
            </button>
          </form>
        </div>
      </Section>

      {/* ── Secretaries section ── */}
      <Section
        title="Secrétaires de la clinique"
        description="Ces secrétaires peuvent gérer tous les médecins de la clinique."
      >
        {secretaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-muted-foreground">
              Aucune secrétaire associée à la clinique.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les secrétaires clinique sont créées par l&apos;administration.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {secretaries.map((sec) => (
              <div
                key={sec.id}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{sec.name}</p>
                  <p className="text-xs text-muted-foreground">{sec.email}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    sec.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {sec.isActive ? "Actif" : "Inactif"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
