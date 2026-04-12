"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle } from "lucide-react";

export default function AvisSOSPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const sessionId = params.sessionId as string;
  const sig = searchParams.get("sig") ?? "";

  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    setServerError("");

    try {
      const res = await fetch("/api/sos/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sig,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setServerError(
          body.error ?? "Une erreur est survenue. Veuillez réessayer."
        );
      }
    } catch {
      setServerError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F0FDFA" }}
    >
      <div className="max-w-sm w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-2xl" aria-hidden="true">
            ⭐
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#134E4A]">
              Évaluer la consultation
            </h1>
            <p className="text-xs text-gray-500">
              Votre avis nous aide à améliorer le service
            </p>
          </div>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle
              className="w-12 h-12 mx-auto text-[#22C55E]"
              aria-hidden="true"
            />
            <p className="text-base font-semibold text-[#134E4A]">
              Merci pour votre avis !
            </p>
            <p className="text-sm text-gray-500">
              Votre évaluation a bien été enregistrée.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Star rating */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Note globale <span className="text-red-500">*</span>
              </p>
              <div
                className="flex gap-1"
                role="group"
                aria-label="Note de 1 à 5 étoiles"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hovered || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                      aria-pressed={star === rating}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded"
                    >
                      <Star
                        className="w-8 h-8 transition-colors"
                        style={{
                          color: active ? "#F59E0B" : "#D1D5DB",
                          fill: active ? "#F59E0B" : "none",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              {rating === 0 && submitting && (
                <p className="text-xs text-red-500 mt-1">
                  Veuillez sélectionner une note.
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label
                htmlFor="comment"
                className="text-sm font-medium text-gray-700 block mb-1"
              >
                Commentaire{" "}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) setComment(e.target.value);
                }}
                placeholder="Partagez votre expérience avec le médecin..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {comment.length}/1000
              </p>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={rating === 0 || submitting}
              className="w-full bg-[#0891B2] hover:bg-[#0e7490] disabled:opacity-50"
            >
              {submitting ? "Envoi en cours..." : "Envoyer mon avis"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
