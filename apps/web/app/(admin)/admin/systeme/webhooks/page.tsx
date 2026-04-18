import { db, webhooks } from "@doktori/db";
import { desc } from "drizzle-orm";
import { WebhooksManager } from "./webhooks-manager";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const rows = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));

  return (
    <div className="p-4 sm:p-8 max-w-[1000px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
        <p className="text-slate-500 mt-1">
          Configurez des endpoints pour recevoir les événements de la plateforme.
        </p>
      </div>
      <WebhooksManager
        initialWebhooks={rows.map((h: typeof rows[0]) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          lastTriggeredAt: h.lastTriggeredAt?.toISOString() ?? null,
          events: h.events as string[],
        }))}
      />
    </div>
  );
}
