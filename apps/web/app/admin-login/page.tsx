"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Users,
  FileText,
  Settings,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("admin-credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Identifiants invalides ou compte désactivé.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  const benefits = [
    { icon: BarChart3, label: "Tableau de bord en temps réel" },
    { icon: Users, label: "Gestion des médecins et patients" },
    { icon: FileText, label: "Analytics et rapports" },
    { icon: Settings, label: "Paramètres de la plateforme" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* ═════ LEFT: hero panel ═════ */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "rgba(8,145,178,0.15)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "rgba(99,102,241,0.12)" }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20">
            <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-2xl font-black text-white">Doktori</span>
            <span className="text-2xl font-black text-doktori-teal-light">.tn</span>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-0.5">
              Administration
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-slate-300 backdrop-blur">
            <Shield className="h-3.5 w-3.5 text-doktori-teal-light" strokeWidth={2.5} />
            ACCÈS SÉCURISÉ
          </div>
          <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
            Gérez votre
            <br />
            <span className="text-doktori-teal-light">plateforme.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Espace réservé aux administrateurs Doktori. Toutes les actions
            sont tracées dans le journal d&apos;audit.
          </p>

          <ul className="mt-8 space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
                  <Icon className="h-3.5 w-3.5 text-doktori-teal-light" strokeWidth={2.5} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © 2025–2026 Doktori · Zone d&apos;administration sécurisée
        </p>
      </div>

      {/* ═════ RIGHT: form ═════ */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
              <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900">Doktori</span>
              <span className="text-xl font-black text-primary">.tn</span>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Administration
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
            <div className="mb-8">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Connexion
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Cette zone est réservée aux administrateurs Doktori.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Email
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-slate-200 bg-white px-4 transition-colors focus-within:border-primary">
                  <Mail
                    className="mr-3 h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-primary"
                    strokeWidth={2.5}
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@doktori.tn"
                    autoComplete="email"
                    className="h-full flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Mot de passe
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-slate-200 bg-white px-4 transition-colors focus-within:border-primary">
                  <Lock
                    className="mr-3 h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-primary"
                    strokeWidth={2.5}
                  />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-full flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400/60"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={3}
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Toutes les actions dans cette zone sont tracées dans le journal
              d&apos;audit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
