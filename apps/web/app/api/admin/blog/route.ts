import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, blogPosts } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const posts = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      description: blogPosts.description,
      category: blogPosts.category,
      isPublished: blogPosts.isPublished,
      publishedAt: blogPosts.publishedAt,
      author: blogPosts.author,
      createdAt: blogPosts.createdAt,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

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

  const { slug, title, content } = body;

  if (!slug || !title || !content) {
    return NextResponse.json(
      { error: "slug, title et content sont obligatoires." },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const [existing] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Ce slug est déjà utilisé." },
      { status: 409 }
    );
  }

  const now = new Date();
  const [post] = await db
    .insert(blogPosts)
    .values({
      slug,
      title,
      description: body.description ?? null,
      content,
      coverImageUrl: body.coverImageUrl ?? null,
      author: body.author ?? "Doktori",
      category: body.category ?? null,
      tags: body.tags ?? [],
      isPublished: body.isPublished ?? false,
      publishedAt: body.isPublished ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}
