"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Calendar,
  Users,
  ShieldCheck,
} from "lucide-react";

export default function SecretaireLoginPage() {
  const router = useRouter();
  const t = useTranslations("secretaryLogin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("secretary-credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("errorInvalidCredentials"));
      } else {
        router.push("/secretaire/dashboard");
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Calendar, key: "feature1" },
    { icon: Users, key: "feature2" },
    { icon: ShieldCheck, key: "feature3" },
  ] as const;

  return (
    <div className="flex min-h-screen">
      {/* ═════ LEFT: hero ═════ */}
      <div className="relative hidden overflow-hidden bg-foreground lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
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
          className="pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/15 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary">
            <ClipboardList className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <span className="font-heading text-2xl font-black text-white">
            Doktori<span className="text-doktori-teal-light">.tn</span>
          </span>
        </Link>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent">
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("badge")}
          </div>
          <h2 className="mt-6 font-heading text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
            {t("heroHeading1")}
            <br />
            <span className="text-doktori-teal-light">{t("heroHeading2")}</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#A7F3D0]">
            {t("heroDesc")}
          </p>

          <ul className="mt-8 space-y-3">
            {features.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-3 text-sm text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
                  <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#A7F3D0]">{t("footer")}</p>
      </div>

      {/* ═════ RIGHT: form ═════ */}
      <div className="flex w-full items-center justify-center bg-secondary/30 px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <ClipboardList className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-xl font-black text-foreground">
              Doktori<span className="text-primary">.tn</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-xl shadow-primary/5 sm:p-10">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <ClipboardList className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="font-heading text-3xl font-black tracking-tight text-foreground">
                {t("formHeading")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("formSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark"
                >
                  {t("emailLabel")}
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-border bg-white px-4 transition-colors focus-within:border-primary">
                  <Mail
                    className="mr-3 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
                    strokeWidth={2.5}
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre@email.tn"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark"
                >
                  {t("passwordLabel")}
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-border bg-white px-4 transition-colors focus-within:border-primary">
                  <Lock
                    className="mr-3 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
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
                    className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

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
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-heading text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-doktori-teal-dark disabled:opacity-60"
              >
                {loading ? (
                  t("loggingIn")
                ) : (
                  <>
                    <span>{t("loginBtn")}</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={3}
                    />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("doctorLink")}{" "}
              <Link href="/connexion" className="font-bold text-primary hover:underline">
                {t("doctorSpace")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
