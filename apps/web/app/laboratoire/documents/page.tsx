"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Folder, Loader2, ExternalLink, Share2, Trash2, Upload, ChevronLeft, ChevronRight,
  FileText, Image, Film
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

type DocRow = {
  id: string;
  patientName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  category: string | null;
  title: string | null;
  labOrderId: string | null;
  uploadedByLabId: string | null;
  sharedFromLabName?: string | null;
  createdAt: string;
};

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="h-8 w-8 text-gray-400" />;
  if (mime.startsWith("image/")) return <Image className="h-8 w-8 text-blue-400" />;
  if (mime.startsWith("video/")) return <Film className="h-8 w-8 text-purple-400" />;
  return <FileText className="h-8 w-8 text-gray-400" />;
}

export default function LaboratoireDocumentsPage() {
  const { data: session } = useSession();
  const t = useTranslations("laboratoire.documents");
  const user = session?.user as { role?: string; labUserRole?: string } | undefined;
  const isAdmin = user?.role === "lab" || user?.labUserRole === "admin";

  const [bucket, setBucket] = useState<"uploaded" | "received">("uploaded");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ bucket, page: String(page), pageSize: String(pageSize) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/laboratoire/documents?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [bucket, q, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm(t("delete") + " ?")) return;
    setDeleting(id);
    await fetch(`/api/laboratoire/documents/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Folder className="h-6 w-6 text-green-600" strokeWidth={2.5} />
          {t("title")}
        </h1>
        {isAdmin && bucket === "uploaded" && (
          <a
            href="/laboratoire/walk-in"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "#16A34A" }}
          >
            <Upload className="h-4 w-4" strokeWidth={2.5} />
            {t("upload")}
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-border p-1 w-fit">
        {(["uploaded", "received"] as const).map((b) => (
          <button
            key={b}
            onClick={() => { setBucket(b); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${bucket === b ? "bg-green-600 text-white" : "text-muted-foreground hover:bg-gray-100"}`}
          >
            {b === "uploaded" ? t("tabs.uploaded") : t("tabs.received")}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        className="border border-border rounded-xl px-3 py-2 text-sm w-64"
        placeholder={t("patient")}
        value={q}
        onChange={(e) => { setQ(e.target.value); setPage(1); }}
      />

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <FileIcon mime={doc.mimeType} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{doc.title ?? doc.fileName}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.patientName}</p>
                </div>
              </div>
              {doc.category && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 w-fit capitalize">
                  {doc.category}
                </span>
              )}
              {doc.sharedFromLabName && (
                <p className="text-xs text-muted-foreground italic">{t("share")} · {doc.sharedFromLabName}</p>
              )}
              <p className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("fr-TN")}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(doc.fileUrl)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100"
                >
                  <Share2 className="h-3 w-3" />
                  Copier lien
                </button>
                {isAdmin && bucket === "uploaded" && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {deleting === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    {t("delete")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
