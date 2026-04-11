"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700"
    >
      Imprimer
    </button>
  );
}
