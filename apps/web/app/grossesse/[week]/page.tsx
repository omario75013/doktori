import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, pregnancyWeekContent } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { Baby, ChevronLeft } from "lucide-react";

const KEY_WEEKS = [4, 12, 20, 32, 40];

export async function generateStaticParams() {
  return KEY_WEEKS.map((w) => ({ week: String(w) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  const weekNum = parseInt(week, 10);
  if (isNaN(weekNum)) return { title: "Page introuvable" };

  const [content] = await db
    .select()
    .from(pregnancyWeekContent)
    .where(eq(pregnancyWeekContent.weekNumber, weekNum))
    .limit(1);

  if (!content) return { title: `Grossesse — Semaine ${weekNum}` };

  return {
    title: `${content.titleFr} | Doktori`,
    description: `Tout ce qu'il faut savoir sur la semaine ${weekNum} de grossesse : symptômes, examens, conseils.`,
    alternates: { canonical: `https://doktori.tn/grossesse/${weekNum}` },
    openGraph: {
      title: content.titleFr,
      description: `Semaine ${weekNum} de grossesse — guide complet sur Doktori.`,
      type: "article",
    },
  };
}

function renderMarkdown(md: string): string {
  // Tiny safe markdown renderer (h2/h3, bold, lists, paragraphs)
  // Not full markdown — just enough for our seeded content.
  let html = md;
  // Escape HTML
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-foreground mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-foreground mt-6 mb-3">$1</h2>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Lists
  html = html.replace(/(^- .+(\n- .+)*)/gm, (match) => {
    const items = match.split("\n").map((l) => `<li class="ml-5 list-disc">${l.replace(/^- /, "")}</li>`).join("");
    return `<ul class="space-y-1 my-3">${items}</ul>`;
  });
  // Paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      if (block.startsWith("<h") || block.startsWith("<ul")) return block;
      return `<p class="my-3 leading-relaxed">${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return html;
}

export default async function PregnancyWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const weekNum = parseInt(week, 10);
  if (isNaN(weekNum) || weekNum < 1 || weekNum > 42) notFound();

  // Try exact match first, then fallback to closest available
  let [content] = await db
    .select()
    .from(pregnancyWeekContent)
    .where(eq(pregnancyWeekContent.weekNumber, weekNum))
    .limit(1);

  let isFallback = false;
  if (!content) {
    // Fallback: nearest week
    const all = await db
      .select({ weekNumber: pregnancyWeekContent.weekNumber })
      .from(pregnancyWeekContent)
      .orderBy(sql`abs(${pregnancyWeekContent.weekNumber} - ${weekNum})`)
      .limit(1);
    if (all.length === 0) notFound();
    [content] = await db
      .select()
      .from(pregnancyWeekContent)
      .where(eq(pregnancyWeekContent.weekNumber, all[0].weekNumber))
      .limit(1);
    isFallback = true;
  }

  if (!content) notFound();

  const tips = (content.tipsFr ?? []) as string[];
  const contentHtml = renderMarkdown(content.contentMdFr);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    headline: content.titleFr,
    about: { "@type": "MedicalCondition", name: "Pregnancy" },
    audience: { "@type": "PeopleAudience", suggestedGender: "Female" },
    inLanguage: "fr-TN",
    url: `https://doktori.tn/grossesse/${content.weekNumber}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-secondary">
        <div className="bg-gradient-to-br from-pink-100 via-rose-50 to-white py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <Link href="/grossesse" className="inline-flex items-center gap-1 text-sm text-pink-700 hover:underline mb-3">
              <ChevronLeft className="w-4 h-4" /> Retour au suivi
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Baby className="w-8 h-8 text-pink-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-pink-700">
                Semaine {content.weekNumber}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight">
              {content.titleFr}
            </h1>
            {content.babySizeFr && (
              <p className="mt-2 text-pink-700">
                Taille du bébé : <strong>{content.babySizeFr}</strong>
              </p>
            )}
            {isFallback && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                Le contenu pour la semaine {weekNum} n&apos;est pas encore disponible. Voici le contenu de la semaine la plus proche.
              </p>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          <article className="bg-white rounded-2xl border border-border shadow-sm p-6 prose prose-sm max-w-none text-foreground">
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </article>

          {tips.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5">
              <h2 className="text-base font-bold text-emerald-900 mb-3">À retenir</h2>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <nav className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-3">Autres semaines clés</h2>
            <div className="flex flex-wrap gap-2">
              {KEY_WEEKS.filter((w) => w !== content!.weekNumber).map((w) => (
                <Link
                  key={w}
                  href={`/grossesse/${w}`}
                  className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
                >
                  Semaine {w}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </main>
    </>
  );
}
