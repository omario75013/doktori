"use client";

import { useEffect, useState } from "react";
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
  CheckCircle2,
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
  pro: { label: "Pro", color: "bg-[#0891B2]/10 text-[#0891B2]" },
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
    <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6">
      <div className="mb-5 border-b border-[#E6F4F1] pb-4">
        <h2 className="font-heading text-base font-bold text-[#134E4A]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#5E7574]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

function Alert({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const isSuccess = type === "success";
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
        isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} />
      )}
      {message}
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
  const [profileAlert, setProfileAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Doctors state
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteAlert, setInviteAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
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
    setProfileSaving(true);
    setProfileAlert(null);
    try {
      const res = await fetch("/api/clinique/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setProfileAlert({ type: "success", message: "Profil mis à jour avec succès." });
        setProfile((prev) => prev ? { ...prev, ...profileForm } : prev);
      } else {
        const data: { error: string } = await res.json();
        setProfileAlert({ type: "error", message: data.error ?? "Erreur lors de la mise à jour." });
      }
    } catch {
      setProfileAlert({ type: "error", message: "Erreur réseau. Réessayez." });
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Invite doctor ────────────────────────────────────────────────────────────
  async function handleInviteDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteAlert(null);
    try {
      const res = await fetch("/api/clinique/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data: { success?: boolean; error?: string; doctor?: { id: string; name: string } } =
        await res.json();
      if (res.ok && data.success) {
        setInviteAlert({
          type: "success",
          message: `${data.doctor?.name ?? "Médecin"} ajouté à la clinique.`,
        });
        setInviteEmail("");
        // Reload doctors list
        const dr = await fetch("/api/clinique/doctors");
        if (dr.ok) {
          const updated: { doctors: ClinicDoctor[] } = await dr.json();
          setDoctors(updated.doctors);
        }
      } else {
        setInviteAlert({
          type: "error",
          message: data.error ?? "Impossible d'ajouter ce médecin.",
        });
      }
    } catch {
      setInviteAlert({ type: "error", message: "Erreur réseau. Réessayez." });
    } finally {
      setInviting(false);
    }
  }

  // ── Remove doctor ────────────────────────────────────────────────────────────
  async function handleRemoveDoctor(doctorId: string) {
    if (!confirm("Retirer ce médecin de la clinique ?")) return;
    setRemovingId(doctorId);
    try {
      const res = await fetch(`/api/clinique/doctors/${doctorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#0891B2]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-black text-[#134E4A]">Paramètres</h1>
          <p className="mt-1 text-sm text-[#5E7574]">
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              Nom de l&apos;établissement
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] px-3 focus-within:border-[#0891B2]">
              <Building2 className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
                className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none"
              />
            </div>
          </div>

          {/* Address + City */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
                Adresse
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] px-3 focus-within:border-[#0891B2]">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
                Ville
              </label>
              <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] px-3 focus-within:border-[#0891B2]">
                <MapPin className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              Téléphone
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] px-3 focus-within:border-[#0891B2]">
              <Phone className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none"
              />
            </div>
          </div>

          {/* Email (read-only — used for login) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              Email de connexion
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] bg-gray-50 px-3">
              <Mail className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
              <span className="text-sm text-[#5E7574]">{profile?.email}</span>
            </div>
            <p className="mt-1 text-xs text-[#5E7574]">
              Pour modifier l&apos;email, contactez le support.
            </p>
          </div>

          {/* Logo URL */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              URL du logo
            </label>
            <div className="flex h-11 items-center rounded-xl border-2 border-[#E6F4F1] px-3 focus-within:border-[#0891B2]">
              <Image className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
              <input
                type="url"
                value={profileForm.logoUrl}
                onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                placeholder="https://..."
                className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none placeholder:text-[#5E7574]/60"
              />
            </div>
          </div>

          {profileAlert && (
            <Alert type={profileAlert.type} message={profileAlert.message} />
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0891B2] px-5 text-sm font-bold text-white transition-all hover:bg-[#0E7490] disabled:opacity-60"
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
            <div className="rounded-xl border border-dashed border-[#E6F4F1] py-8 text-center">
              <Users className="mx-auto h-8 w-8 text-[#5E7574]/40" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-[#5E7574]">
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E6F4F1] p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {doc.photoUrl ? (
                        <div className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-[#E6F4F1]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.photoUrl}
                            alt={doc.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2] text-xs font-black text-white">
                          {initials}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-white">
                        <BadgeCheck className="h-3.5 w-3.5 fill-[#22C55E] text-white" strokeWidth={2.5} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#134E4A]">{doc.name}</p>
                      <p className="text-xs text-[#5E7574]">{spec?.label ?? doc.specialty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.role === "admin"
                          ? "bg-[#0891B2]/10 text-[#0891B2]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ROLE_LABELS[doc.role] ?? doc.role}
                    </span>
                    <button
                      onClick={() => handleRemoveDoctor(doc.id)}
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

        {/* Invite form */}
        <div className="rounded-xl bg-[#F0FDFA] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
            Inviter un médecin
          </p>
          <form onSubmit={handleInviteDoctor} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex h-11 flex-1 items-center rounded-xl border-2 border-[#E6F4F1] bg-white px-3 focus-within:border-[#0891B2]">
                <Mail className="mr-2 h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2} />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@medecin.tn"
                  required
                  className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none placeholder:text-[#5E7574]/60"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                className="h-11 rounded-xl border-2 border-[#E6F4F1] bg-white px-3 text-sm font-medium text-[#134E4A] outline-none focus:border-[#0891B2]"
              >
                <option value="member">Membre</option>
                <option value="admin">Responsable</option>
              </select>
            </div>
            {inviteAlert && (
              <Alert type={inviteAlert.type} message={inviteAlert.message} />
            )}
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0891B2] px-4 text-sm font-bold text-white transition-all hover:bg-[#0E7490] disabled:opacity-60"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              ) : (
                <UserPlus className="h-4 w-4" strokeWidth={2.5} />
              )}
              Ajouter
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
          <div className="rounded-xl border border-dashed border-[#E6F4F1] py-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-[#5E7574]/40" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-[#5E7574]">
              Aucune secrétaire associée à la clinique.
            </p>
            <p className="mt-1 text-xs text-[#5E7574]">
              Les secrétaires clinique sont créées par l&apos;administration.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {secretaries.map((sec) => (
              <div
                key={sec.id}
                className="flex items-center justify-between rounded-xl border border-[#E6F4F1] p-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#134E4A]">{sec.name}</p>
                  <p className="text-xs text-[#5E7574]">{sec.email}</p>
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
