import { NextResponse } from "next/server";

// GET: Meta webhook verification (hub.challenge)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: receive delivery status updates
export async function POST(req: Request) {
  const body = await req.json();
  // For MVP, just log
  console.log("[WA-webhook]", JSON.stringify(body));
  return NextResponse.json({ received: true });
}
