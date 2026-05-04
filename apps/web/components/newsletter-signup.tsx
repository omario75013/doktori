"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";

interface Props {
  source?: string;
  language?: "fr" | "ar";
  variant?: "default" | "compact";
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
}

export function NewsletterSignup({
  source = "footer",
  language = "fr",
  variant = "default",
  placeholder,
  buttonLabel,
  successMessage,
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const labels = {
    fr: {
      placeholder: placeholder ?? "Votre adresse email",
      button: buttonLabel ?? "S'inscrire",
      success: successMessage ?? "Merci ! Vérifiez votre boîte mail pour confirmer.",
      errorGeneric: "Une erreur est survenue. Réessayez.",
      errorEmail: "Email invalide",
    },
    ar: {
      placeholder: placeholder ?? "البريد الإلكتروني",
      button: buttonLabel ?? "اشتراك",
      success: successMessage ?? "شكراً! تحقق من بريدك للتأكيد.",
      errorGeneric: "حدث خطأ. حاول مرة أخرى.",
      errorEmail: "بريد إلكتروني غير صالح",
    },
  }[language];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language, source }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(data?.error === "Email invalide" ? labels.errorEmail : labels.errorGeneric);
      }
    } catch {
      setStatus("error");
      setErrorMsg(labels.errorGeneric);
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
        {labels.success}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={labels.placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={labels.placeholder}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
        >
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.button}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={labels.placeholder}
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={labels.placeholder}
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.button}
      </button>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
    </form>
  );
}
