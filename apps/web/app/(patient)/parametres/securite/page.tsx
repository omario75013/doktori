"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ShieldCheck,
  ShieldOff,
  QrCode,
  CheckCircle,
  Copy,
  AlertTriangle,
  Lock,
} from "lucide-react";

type Step = "idle" | "scan" | "verify" | "backup";

interface TwoFaStatus {
  enabled: boolean;
}

export default function SecuriteParametresPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.replace("/connexion-patient");
      return;
    }
    setToken(stored);

    // Check current 2FA status
    fetch("/api/me/2fa/setup", {
      method: "GET",
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.enabled ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function startSetup() {
    if (!token) return;
    try {
      const res = await fetch("/api/me/2fa/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setQrDataUrl(data.qrDataUrl);
        setSecret(data.secret);
        setStep("scan");
      } else {
        toast.error(data.error || "Erreur lors de la configuration");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }

  async function verifyCode() {
    if (!token || !code) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/me/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes ?? []);
        setStep("backup");
        setEnabled(true);
        toast.success("2FA activée avec succès !");
      } else {
        toast.error(data.error || "Code invalide");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable() {
    if (!token || !disablePassword) return;
    setDisabling(true);
    try {
      const res = await fetch("/api/me/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(false);
        setShowDisableForm(false);
        setDisablePassword("");
        toast.success("2FA désactivée.");
      } else {
        toast.error(data.error || "Erreur lors de la désactivation");
      }
    } finally {
      setDisabling(false);
    }
  }

  function copyCode(c: string) {
    navigator.clipboard.writeText(c).then(() => toast.success("Copié !"));
  }

  function finishSetup() {
    setStep("idle");
    setQrDataUrl(null);
    setSecret(null);
    setCode("");
    setBackupCodes([]);
  }

  return (
    <div>
      <div className="space-y-5">
        <div>
          <div className="ds-eyebrow">PARAMÈTRES</div>
          <h1 className="ds-page-title">Sécurité</h1>
          <p className="ds-page-sub">Gérez votre mot de passe, votre téléphone et la double authentification.</p>
        </div>

        <EmailCard />
        <PasswordChangeCard token={token} />
        <PhoneChangeCard token={token} />

        {/* 2FA section */}
        <div className="ds-card-patient p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Double authentification (2FA)</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Renforcez la sécurité de votre compte avec une application d'authentification (Google Authenticator, Authy…).
          </p>

          {loading ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ) : step === "idle" ? (
            enabled ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    2FA activée
                  </span>
                </div>
                {!showDisableForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableForm(true)}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <ShieldOff className="w-4 h-4 me-2" />
                    Désactiver la 2FA
                  </Button>
                ) : (
                  <div className="mt-3 space-y-3 max-w-sm">
                    <p className="text-sm text-gray-500">Entrez votre mot de passe pour confirmer :</p>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Mot de passe"
                        className="ps-10 rounded-xl h-11"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowDisableForm(false); setDisablePassword(""); }}
                        className="rounded-xl"
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDisable}
                        disabled={disabling || !disablePassword}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                      >
                        {disabling ? "Désactivation…" : "Confirmer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={startSetup} className="rounded-xl">
                <QrCode className="w-4 h-4 me-2" />
                Activer la double authentification
              </Button>
            )
          ) : step === "scan" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p className="text-sm font-semibold text-foreground">Scannez ce QR code avec votre application</p>
              </div>
              {qrDataUrl && (
                <div className="inline-block rounded-xl border border-border p-2 bg-white">
                  <img src={qrDataUrl} alt="QR Code 2FA" width={180} height={180} />
                </div>
              )}
              {secret && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Ou entrez ce code manuellement :</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-foreground break-all">{secret}</code>
                    <button onClick={() => copyCode(secret!)} className="text-gray-400 hover:text-gray-600 shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              <Button onClick={() => setStep("verify")} className="rounded-xl">
                J'ai scanné le QR code →
              </Button>
            </div>
          ) : step === "verify" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p className="text-sm font-semibold text-foreground">Entrez le code de vérification</p>
              </div>
              <p className="text-sm text-gray-500">
                Ouvrez votre application d'authentification et entrez le code à 6 chiffres.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123 456"
                className="rounded-xl h-12 text-center text-lg tracking-widest font-mono w-40"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("scan")} className="rounded-xl">
                  Retour
                </Button>
                <Button
                  onClick={verifyCode}
                  disabled={verifying || code.length !== 6}
                  className="rounded-xl"
                >
                  {verifying ? "Vérification…" : "Vérifier"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p className="text-sm font-semibold text-foreground">Codes de secours — Sauvegardez-les !</p>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Ces codes permettent d'accéder à votre compte si vous perdez votre téléphone.
                  Ils ne seront plus affichés après cette page.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2"
                  >
                    <code className="text-sm font-mono text-foreground">{c}</code>
                    <button onClick={() => copyCode(c)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button onClick={finishSetup} className="rounded-xl">
                <CheckCircle className="w-4 h-4 me-2" />
                J'ai sauvegardé mes codes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Email display card (read-only) ───────── */
function EmailCard() {
  const [email, setEmail] = useState<string>("");
  const [verified, setVerified] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/patients/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.email) {
          setEmail(d.email);
          setVerified(true); // accounts created via OTP have email pre-confirmed
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="ds-card-patient p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Adresse email</h2>
        </div>
        {verified && email && (
          <span
            className="ds-chip ds-chip-mint"
            title="Adresse email vérifiée"
          >
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {email || "Aucune adresse email enregistrée."}
      </p>
      <p
        className="text-[12px] mt-2"
        style={{ color: "var(--ink-500)" }}
      >
        L'adresse email sert d'identifiant de connexion et ne peut pas être modifiée depuis votre
        compte. Contactez le support si vous devez la changer.
      </p>
    </div>
  );
}

/* ───────── Phone change card ───────── */
function PhoneChangeCard({ token }: { token: string | null }) {
  const [currentPhone, setCurrentPhone] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "verify">("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch("/api/patients/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.phone) setCurrentPhone(d.phone);
      })
      .catch(() => {});
  }, [token]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setWarning(null);
    setSending(true);
    try {
      const res = await fetch("/api/me/phone/request-code", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Code envoyé par SMS");
        setStep("verify");
      } else if (res.status === 409 && data.error === "PHONE_ALREADY_USED") {
        setWarning(data.message);
      } else {
        toast.error(data.error || "Erreur");
      }
    } finally {
      setSending(false);
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch("/api/me/phone/verify", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Numéro de téléphone mis à jour");
        setCurrentPhone(data.phone);
        setPhone("");
        setCode("");
        setStep("input");
        setOpen(false);
      } else if (res.status === 409) {
        setStep("input");
        setWarning(data.message || "Ce numéro vient d'être pris par un autre compte.");
      } else {
        toast.error(data.error || "Code incorrect");
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="ds-card-patient p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Numéro de téléphone</h2>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setWarning(null);
              setStep("input");
            }}
            className="ds-btn ds-btn-soft ds-btn-sm"
          >
            Modifier
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Numéro actuel : <span className="font-semibold text-foreground">{currentPhone || "—"}</span>
      </p>

      {open && (
        <div className="mt-4">
          {warning && (
            <div
              className="mb-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm"
              style={{
                background: "#FEF3C7",
                borderColor: "#FBBF24",
                color: "#92400E",
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {step === "input" ? (
            <form onSubmit={sendCode} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <PhoneInput
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  setWarning(null);
                }}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setPhone("");
                    setWarning(null);
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={sending || !phone} className="rounded-xl">
                  {sending ? "Envoi…" : "Envoyer le code"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitVerify} className="space-y-3">
              <p className="text-sm" style={{ color: "var(--ink-700)" }}>
                Un code à 6 chiffres a été envoyé au{" "}
                <span className="font-semibold">{phone}</span>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("input");
                      setCode("");
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={verifying || code.length !== 6}
                    className="rounded-xl"
                  >
                    {verifying ? "Vérification…" : "Vérifier"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Password change card ───────── */
function PasswordChangeCard({ token }: { token: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Le nouveau mot de passe doit faire au moins 8 caractères");
      return;
    }
    if (next !== confirmPw) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: current || undefined, newPassword: next }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Mot de passe mis à jour");
        setCurrent("");
        setNext("");
        setConfirmPw("");
        setOpen(false);
      } else {
        toast.error(data.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ds-card-patient p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Mot de passe</h2>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ds-btn ds-btn-soft ds-btn-sm"
          >
            Changer
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Définissez un mot de passe d'au moins 8 caractères pour sécuriser votre compte.
      </p>

      {open && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[color:var(--ink-400)]">
              Mot de passe actuel (laisser vide si jamais défini)
            </label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[color:var(--ink-400)]">
              Nouveau mot de passe
            </label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min. 8 caractères"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[color:var(--ink-400)]">
              Confirmer
            </label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Répétez le nouveau mot de passe"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setCurrent("");
                setNext("");
                setConfirmPw("");
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
