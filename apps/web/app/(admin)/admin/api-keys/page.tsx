import { db, apiKeys } from "@doktori/db";
import { desc } from "drizzle-orm";
import { Key } from "lucide-react";
import ApiKeysClient from "./api-keys-client";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  const rows = await db
    .select({
      id: apiKeys.id,
      prefix: apiKeys.prefix,
      name: apiKeys.name,
      ownerEmail: apiKeys.ownerEmail,
      scopes: apiKeys.scopes,
      rateLimitPerMinute: apiKeys.rateLimitPerMinute,
      active: apiKeys.active,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Key className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clés API</h1>
          <p className="text-slate-500 mt-1">
            Gérez les clés d&apos;accès à l&apos;API publique en lecture seule.
          </p>
        </div>
      </div>

      <ApiKeysClient initialKeys={rows.map((r) => ({
        ...r,
        scopes: r.scopes ?? [],
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      }))} />
    </div>
  );
}
