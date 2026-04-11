import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold text-blue-600 tracking-tight">
          Doktori
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/recherche"
            className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors sm:block"
          >
            Rechercher un médecin
          </Link>
          <Link
            href="/connexion"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-600 bg-white px-4 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            Espace médecin
          </Link>
        </nav>
      </div>
    </header>
  );
}
