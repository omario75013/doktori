import Link from "next/link";
import { Stethoscope, Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDFA] to-white flex flex-col">
      {/* Minimal header */}
      <header className="w-full border-b border-[#E6F4F1] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2 font-heading text-xl font-black tracking-tight text-[#134E4A]"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2] text-white shadow-sm ring-1 ring-[#0891B2]/20 transition-all group-hover:bg-[#0E7490]">
              <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span>
              Doktori<span className="text-[#0891B2]">.tn</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Large 404 */}
        <div className="relative mb-6 select-none">
          <span className="font-heading text-[8rem] sm:text-[10rem] font-black leading-none text-[#0891B2]/10 tracking-tight">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-[8rem] sm:text-[10rem] font-black leading-none bg-gradient-to-b from-[#0891B2] to-[#22D3EE] bg-clip-text text-transparent tracking-tight opacity-20">
              404
            </span>
          </div>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#134E4A] mb-3">
          Page introuvable
        </h1>
        <p className="text-[#5E7574] max-w-md mb-10 text-base leading-relaxed">
          La page que vous recherchez n'existe pas ou a été déplacée.
          Utilisez la recherche pour trouver un médecin près de chez vous.
        </p>

        {/* Search bar */}
        <form
          action="/recherche"
          method="get"
          className="w-full max-w-md mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5E7574]" />
            <input
              type="text"
              name="q"
              placeholder="Trouver un médecin, une spécialité…"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-[#E6F4F1] bg-white text-[#134E4A] placeholder:text-[#5E7574] focus:outline-none focus:ring-2 focus:ring-[#0891B2] shadow-sm text-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-[#0891B2] text-white text-sm font-semibold hover:bg-[#0E7490] transition-colors"
            >
              Rechercher
            </button>
          </div>
        </form>

        {/* Navigation links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6F4F1] bg-white px-4 py-2.5 text-sm font-semibold text-[#134E4A] hover:bg-[#F0FDFA] hover:border-[#0891B2]/30 transition-colors shadow-sm"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0891B2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0E7490] transition-colors shadow-sm"
          >
            <Search className="h-4 w-4" />
            Rechercher un médecin
          </Link>
        </div>
      </main>

      {/* Footer note */}
      <footer className="py-6 text-center">
        <p className="text-xs text-[#5E7574]">
          &copy; {new Date().getFullYear()} Doktori.tn — Votre santé, notre priorité
        </p>
      </footer>
    </div>
  );
}
