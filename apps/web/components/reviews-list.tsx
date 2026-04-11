"use client";

import { useEffect, useState } from "react";
import { StarRating } from "./star-rating";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  createdAt: string;
  patientName: string;
}

interface Props {
  doctorId: string;
}

export function ReviewsList({ doctorId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<{ count: number; average: number }>({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews?doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setStats(data.stats || { count: 0, average: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [doctorId]);

  if (loading) return <p className="text-gray-400 text-sm">Chargement des avis...</p>;

  if (stats.count === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl border">
        <p className="text-gray-400 text-sm">Aucun avis pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div>
          <div className="text-4xl font-bold">{stats.average.toFixed(1)}</div>
          <StarRating value={Math.round(stats.average)} readOnly size="md" />
        </div>
        <div className="text-sm text-gray-500">
          {stats.count} avis vérifié{stats.count > 1 ? "s" : ""}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <StarRating value={r.rating} readOnly size="sm" />
                <p className="text-sm font-medium mt-1">{r.patientName || "Patient anonyme"}</p>
              </div>
              <div className="text-xs text-gray-400">
                {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                {r.verified && <span className="ml-2 text-green-600">✓ Vérifié</span>}
              </div>
            </div>
            {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
