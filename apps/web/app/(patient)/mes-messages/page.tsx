"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  id: string;
  status: string;
  lastMessageAt: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhotoUrl: string | null;
}

type Step = "phone" | "code" | "loggedIn";

export default function PatientMessageriePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (stored) {
      setToken(stored);
      setStep("loggedIn");
    }
  }, []);

  useEffect(() => {
    if (step === "loggedIn" && token) {
      setLoading(true);
      fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem("doktori_patient_token");
            setToken(null);
            setStep("phone");
            return [];
          }
          return r.json();
        })
        .then((data) => {
          setConversations(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [step, token]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Erreur");
      return;
    }
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Code invalide");
      return;
    }
    const data = await res.json();
    localStorage.setItem("doktori_patient_token", data.token);
    setToken(data.token);
    setStep("loggedIn");
  }

  function logout() {
    localStorage.removeItem("doktori_patient_token");
    setToken(null);
    setStep("phone");
    setPhone("");
    setCode("");
  }

  if (step === "phone") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-teal-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
            <p className="text-sm text-gray-500">Communiquez avec vos médecins</p>
          </div>
        </div>
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
            {loading ? "Envoi..." : "Recevoir le code par SMS"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Code de vérification</h1>
        <p className="text-gray-500 mb-6">Code envoyé au {phone}</p>
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
            {loading ? "Vérification..." : "Valider"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Changer de numéro
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-teal-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:underline">
          Se déconnecter
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Chargement...</p>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune conversation</p>
          <p className="text-sm text-gray-400 mt-1">
            Vous pouvez contacter un médecin après votre consultation
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const initials = conv.doctorName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messagerie/${conv.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-teal-200 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{conv.doctorName}</p>
                  <p className="text-sm text-teal-600 truncate">{conv.doctorSpecialty}</p>
                  {conv.lastMessageAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
