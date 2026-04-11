"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";

export default function SubmitReviewPage({ params }: { params: Promise<{ appointmentId: string }> }) {
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
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl text-green-600 mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Merci pour votre avis !</h1>
        <p className="text-gray-500 mb-6">Votre retour aide les autres patients à trouver le bon médecin.</p>
        <Button onClick={() => router.push("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Votre avis compte</h1>
      <p className="text-gray-500 mb-6">Comment s'est passée votre consultation ?</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
        <div>
          <p className="text-sm font-medium mb-3">Votre note</p>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium mb-2">
            Commentaire (optionnel)
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience..."
            rows={4}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Envoi..." : "Publier mon avis"}
        </Button>
      </form>
    </div>
  );
}
