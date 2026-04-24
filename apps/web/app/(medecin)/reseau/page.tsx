import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { ReseauClient } from "./reseau-client";

type DoctorCard = {
  id: string;
  name: string;
  slug: string;
  specialty: string | null;
  city: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number | null;
  bio: string | null;
};

export default async function ReseauPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    redirect("/connexion");
  }

  const rows = (await db.execute(sql`
    SELECT
      id, name, slug, specialty, city,
      photo_url      AS "photoUrl",
      average_rating AS "averageRating",
      review_count   AS "reviewCount",
      bio
    FROM doctors
    WHERE id <> ${session.user.id}
      AND is_active = true
    ORDER BY COALESCE(average_rating, 0) DESC, review_count DESC NULLS LAST
    LIMIT 200
  `)) as unknown as DoctorCard[];

  // "Mon réseau" — doctors connected via doctor_connections. The table doesn't
  // exist yet (Phase 5 migration pending), so we fall back to an empty list.
  let connections: DoctorCard[] = [];
  try {
    connections = (await db.execute(sql`
      SELECT
        d.id, d.name, d.slug, d.specialty, d.city,
        d.photo_url      AS "photoUrl",
        d.average_rating AS "averageRating",
        d.review_count   AS "reviewCount",
        d.bio
      FROM doctor_connections c
      INNER JOIN doctors d
        ON d.id = CASE
          WHEN c.requester_id = ${session.user.id} THEN c.addressee_id
          ELSE c.requester_id
        END
      WHERE c.status = 'accepted'
        AND (c.requester_id = ${session.user.id} OR c.addressee_id = ${session.user.id})
        AND d.is_active = true
      ORDER BY d.name
    `)) as unknown as DoctorCard[];
  } catch {
    // doctor_connections table not yet created — empty list is the correct default
  }

  return <ReseauClient doctors={rows} connections={connections} />;
}
