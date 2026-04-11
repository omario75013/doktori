import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const result = await db.execute(sql`
    SELECT sos_available, sos_radius_km, sos_fee, latitude, longitude
    FROM doctors WHERE id = ${session.user.id} LIMIT 1
  `);

  return NextResponse.json((result as unknown as any[])[0] || {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { sosAvailable, sosRadiusKm, sosFee, latitude, longitude } = await req.json();

  if (typeof sosAvailable !== "boolean") {
    return NextResponse.json({ error: "sosAvailable requis" }, { status: 400 });
  }

  // When enabling, require location
  if (sosAvailable && (typeof latitude !== "number" || typeof longitude !== "number")) {
    return NextResponse.json(
      { error: "Localisation requise pour activer le mode SOS" },
      { status: 400 }
    );
  }

  if (sosAvailable) {
    await db.execute(sql`
      UPDATE doctors SET
        sos_available = true,
        sos_radius_km = ${sosRadiusKm || 10},
        sos_fee = ${sosFee ? sosFee * 1000 : null},
        latitude = ${String(latitude)},
        longitude = ${String(longitude)},
        location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${session.user.id}
    `);
  } else {
    await db.execute(sql`
      UPDATE doctors SET sos_available = false WHERE id = ${session.user.id}
    `);
  }

  return NextResponse.json({ success: true });
}
