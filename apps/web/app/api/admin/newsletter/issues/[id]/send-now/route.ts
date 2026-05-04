import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sendNewsletterIssue } from "@/lib/newsletter-send";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const result = await sendNewsletterIssue(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[newsletter send-now]", err);
    return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 });
  }
}
