"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ALLOWED_PAGE_SIZES } from "@/lib/admin-pagination";

export function AdminPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function nav(nextPage: number, nextSize: number) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextSize));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm">
      <div className="text-slate-600">
        {total === 0 ? (
          "Aucun résultat"
        ) : (
          <>
            <span className="font-medium text-slate-900">{start}</span>
            {"–"}
            <span className="font-medium text-slate-900">{end}</span>
            {" sur "}
            <span className="font-medium text-slate-900">{total}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-slate-600">
          <span>Par page :</span>
          <select
            value={pageSize}
            onChange={(e) => nav(1, Number(e.target.value))}
            disabled={pending}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {ALLOWED_PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            onClick={() => nav(page - 1, pageSize)}
            disabled={pending || page <= 1}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-slate-700 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => nav(page + 1, pageSize)}
            disabled={pending || page >= totalPages}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
