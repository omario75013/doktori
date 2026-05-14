"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LabTableActionsProps {
  labId: string;
}

export function LabTableActions({ labId }: LabTableActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"verified" | "rejected" | null>(null);

  async function updateStatus(verificationStatus: "verified" | "rejected") {
    setLoading(verificationStatus);
    try {
      const res = await fetch(`/api/admin/laboratoires/${labId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={() => updateStatus("verified")}
        disabled={loading !== null}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
      >
        {loading === "verified" ? "..." : "Vérifier"}
      </button>
      <button
        onClick={() => updateStatus("rejected")}
        disabled={loading !== null}
        className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        {loading === "rejected" ? "..." : "Rejeter"}
      </button>
    </div>
  );
}
