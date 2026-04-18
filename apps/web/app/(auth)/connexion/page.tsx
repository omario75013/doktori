"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Stethoscope,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function ConnexionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("doctor-credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ═════ LEFT: hero ═════ */}
      <div className="relative hidden overflow-hidden bg-[#134E4A] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-[#0891B2]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-[#22C55E]/15 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0891B2]">
            <Stethoscope className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="font-heading text-2xl font-black text-white">
            Doktori<span className="text-[#22D3EE]">.tn</span>
          </span>
        </Link>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-1.5 text-xs font-bold text-[#22C55E]">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            PROGRAMME FONDATEUR
          </div>
          <h2 className="mt-6 font-heading text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
            Gérez votre cabinet
            <br />
            <span className="text-[#22D3EE]">en toute sérénité.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#A7F3D0]">
            Agenda en ligne 24/7, rappels SMS automatiques, et statistiques en temps
            réel. Tout ce dont vous avez besoin pour grandir.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Agenda en ligne 24/7",
              "Rappels SMS automatiques",
              "Vitrine référencée Google",
              "Support WhatsApp dédié",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#22C55E] text-[#134E4A]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#A7F3D0]">
          © 2025–2026 Doktori · Fait avec soin pour la santé des Tunisiens
        </p>
      </div>

      {/* ═════ RIGHT: form ═════ */}
      <div className="flex w-full items-center justify-center bg-[#F0FDFA]/30 px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2] text-white">
              <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-xl font-black text-[#134E4A]">
              Doktori<span className="text-[#0891B2]">.tn</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-[#E6F4F1] bg-white p-8 shadow-xl shadow-[#0891B2]/5 sm:p-10">
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-black tracking-tight text-[#134E4A]">
                Bon retour 👋
              </h1>
              <p className="mt-2 text-sm text-[#5E7574]">
                Connectez-vous à votre espace médecin Doktori.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0E7490]"
                >
                  {t("email")}
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-[#E6F4F1] bg-white px-4 transition-colors focus-within:border-[#0891B2]">
                  <Mail
                    className="mr-3 h-4 w-4 shrink-0 text-[#5E7574] transition-colors group-focus-within:text-[#0891B2]"
                    strokeWidth={2.5}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre.email@exemple.tn"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none placeholder:text-[#5E7574]/60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-[#0E7490]"
                  >
                    {t("password")}
                  </label>
                </div>
                <div className="group flex h-12 items-center rounded-xl border-2 border-[#E6F4F1] bg-white px-4 transition-colors focus-within:border-[#0891B2]">
                  <Lock
                    className="mr-3 h-4 w-4 shrink-0 text-[#5E7574] transition-colors group-focus-within:text-[#0891B2]"
                    strokeWidth={2.5}
                  />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent text-sm text-[#134E4A] outline-none placeholder:text-[#5E7574]/60"
                  />
                </div>
              </div>

              {/* Email verification banner */}
              {verified === "success" && (
                <div className="flex items-start gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter.</span>
                </div>
              )}
              {verified === "already" && (
                <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>Votre email est déjà vérifié. Connectez-vous ci-dessous.</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0891B2] font-heading text-base font-bold text-white shadow-lg shadow-[#0891B2]/20 transition-all hover:bg-[#0E7490] disabled:opacity-60"
              >
                {loading ? (
                  t("loginLoading")
                ) : (
                  <>
                    <span>{t("loginButton")}</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={3}
                    />
                  </>
                )}
              </button>

            </form>

            <p className="mt-6 text-center text-sm text-[#5E7574]">
              {t("noAccount")}{" "}
              <Link
                href="/inscription"
                className="font-bold text-[#0891B2] hover:underline"
              >
                {t("createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
