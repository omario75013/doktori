import { notFound } from "next/navigation";
import { db, blogPosts } from "@doktori/db";
import { eq } from "drizzle-orm";
import { BlogEditor } from "./blog-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // "nouveau" is handled specially — no DB fetch needed
  if (id === "nouveau") {
    return <BlogEditor post={null} />;
  }

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);

  if (!post) notFound();

  return (
    <BlogEditor
      post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description ?? "",
        content: post.content,
        coverImageUrl: post.coverImageUrl ?? "",
        author: post.author,
        category: post.category ?? "",
        tags: (post.tags as string[]).join(", "),
        isPublished: post.isPublished,
      }}
    />
  );
}
