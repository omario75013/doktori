import { NextResponse } from "next/server";
import { meili, DOCTORS_INDEX } from "@/lib/meilisearch";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const specialty = searchParams.get("specialty");
  const city = searchParams.get("city");

  const filters: string[] = [];
  if (specialty) filters.push(`specialty = "${specialty}"`);
  if (city) filters.push(`city = "${city}"`);

  const results = await meili.index(DOCTORS_INDEX).search(q, {
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    limit: 20,
  });

  return NextResponse.json(results);
}
