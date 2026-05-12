import { NextResponse, NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConversations, doctorMessages, doctorNotifications } from "@doktori/db";
import { and, eq, or, asc, isNull, ne } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";
import { broadcastPeerMessage } from "@/lib/peer-message-broadcast";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function authorizeConversation(conversationId: string, userId: string) {
  const [conv] = await db
    .select()
    .from(doctorConversations)
    .where(
      and(
        eq(doctorConversations.id, conversationId),
        or(
          eq(doctorConversations.doctorAId, userId),
          eq(doctorConversations.doctorBId, userId),
        ),
      ),
    )
    .limit(1);
  return conv ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await authorizeConversation(id, user.id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const rows = await db
    .select()
    .from(doctorMessages)
    .where(eq(doctorMessages.conversationId, id))
    .orderBy(asc(doctorMessages.createdAt));

  // Mark every peer-sent message in this conversation as read.
  await db
    .update(doctorMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(doctorMessages.conversationId, id),
        ne(doctorMessages.senderId, user.id),
        isNull(doctorMessages.readAt),
      ),
    );

  return NextResponse.json(rows);
}

const jsonSchema = z.object({
  body: z.string().trim().max(4000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await authorizeConversation(id, user.id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Two input modes: JSON (text only) and multipart (text + image up to 5 MB).
  const ct = req.headers.get("content-type") ?? "";
  let bodyText = "";
  let imageUrl: string | null = null;
  let imageMime: string | null = null;

  if (ct.startsWith("multipart/form-data")) {
    const form = await req.formData();
    bodyText = ((form.get("body") as string) ?? "").trim();
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_IMAGE_MIME.has(file.type)) {
        return NextResponse.json(
          { error: "Format d'image non supporté (JPG, PNG, WebP, GIF)" },
          { status: 400 },
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image trop volumineuse (max 5 Mo)" },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 8);
      const key = `peer-chat/${id}/${randomUUID()}.${ext}`;
      imageUrl = await uploadToR2(buf, key, file.type);
      imageMime = file.type;
    }
    if (!bodyText && !imageUrl) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }
  } else {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
    }
    const parsed = jsonSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 });
    }
    bodyText = (parsed.data.body ?? "").trim();
    if (!bodyText) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }
  }

  const [msg] = await db
    .insert(doctorMessages)
    .values({
      conversationId: id,
      senderId: user.id,
      body: bodyText,
      imageUrl,
      imageMimeType: imageMime,
    })
    .returning();

  await db
    .update(doctorConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(doctorConversations.id, id));

  const peerId = conv.doctorAId === user.id ? conv.doctorBId : conv.doctorAId;
  await db.insert(doctorNotifications).values({
    doctorId: peerId,
    type: "peer_message",
    payload: { conversationId: id, senderId: user.id },
  });

  // Live push via the existing Socket.IO server (sockets/sos-server.ts
  // exposes /broadcast). Falls through silently if the WS server isn't up
  // — the client's 10s poll still picks up the message.
  void broadcastPeerMessage(id, "message:new", msg);

  return NextResponse.json({ ok: true, message: msg }, { status: 201 });
}
