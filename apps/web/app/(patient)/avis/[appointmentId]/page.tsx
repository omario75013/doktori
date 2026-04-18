"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { Star, CheckCircle } from "lucide-react";

export default function SubmitReviewPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const t = useTranslations("avis");
  const { appointmentId } = use(params);
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, rating, comment: comment || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Erreur");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-10 shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#0891B2]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-[#134E4A] mb-2">{t("thankYou")}</h1>
          <p className="text-gray-500 mb-6">Votre retour aide les autres patients à trouver le bon médecin.</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-[#0891B2] hover:bg-[#0E7490] h-12 rounded-xl w-full text-white"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 text-[#0891B2]" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Votre avis compte</h1>
          <p className="text-gray-500 mt-1">Comment s'est passée votre consultation ?</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm space-y-6">
          <div>
            <p className="text-sm font-medium text-[#134E4A] mb-3">Votre note</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-[#134E4A] mb-2">
              Commentaire (optionnel)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={4}
              className="rounded-xl border-[#E6F4F1] focus:border-[#0891B2] focus:ring-[#0891B2]/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-[#0891B2] hover:bg-[#0E7490] h-12 rounded-xl text-white font-medium"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Publier mon avis"}
          </Button>
        </form>
      </div>
    </div>
  );
}
