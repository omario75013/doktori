"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-[#E6F4F1] bg-white px-5 py-2.5 text-sm font-semibold text-[#134E4A] hover:border-[#0891B2] hover:text-[#0891B2] transition-colors"
    >
      Télécharger / Imprimer
    </button>
  );
}
