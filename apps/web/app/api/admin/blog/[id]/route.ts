import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, blogPosts } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "marketing"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [existing] = await db
      .select({ id: blogPosts.id, isPublished: blogPosts.isPublished, publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const body = (await req.json()) as {
      slug?: string;
      title?: string;
      description?: string | null;
      content?: string;
      coverImageUrl?: string | null;
      author?: string;
      category?: string | null;
      tags?: string[];
      isPublished?: boolean;
    };

    // If publishing for the first time, set publishedAt
    const publishedAt =
      body.isPublished && !existing.isPublished
        ? new Date()
        : body.isPublished === false
        ? null
        : existing.publishedAt;

    const [post] = await db
      .update(blogPosts)
      .set({
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.coverImageUrl !== undefined ? { coverImageUrl: body.coverImageUrl } : {}),
        ...(body.author !== undefined ? { author: body.author } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    return NextResponse.json({ post });
  } catch (e) {
    console.error("[PATCH /api//admin/blog/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "marketing"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api//admin/blog/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
