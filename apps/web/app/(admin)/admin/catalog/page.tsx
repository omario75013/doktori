import Link from "next/link";
import { ArrowLeft, FileText, MapPin, Shield, ListTodo, Search } from "lucide-react";

interface Tile {
  href: string;
  label: string;
  description: string;
  icon: typeof FileText;
}

const tiles: Tile[] = [
  {
    href: "/admin/catalog/specialites",
    label: "Spécialités",
    description: "Catalogue des spécialités médicales",
    icon: FileText,
  },
  {
    href: "/admin/catalog/villes",
    label: "Villes",
    description: "Catalogue des villes (avec coordonnées)",
    icon: MapPin,
  },
  {
    href: "/admin/catalog/assurances",
    label: "Assurances",
    description: "Organismes d'assurance maladie (CNAM, mutuelles)",
    icon: Shield,
  },
  {
    href: "/admin/catalog/motifs",
    label: "Motifs",
    description: "Modèles globaux importables par les médecins",
    icon: ListTodo,
  },
  {
    href: "/admin/catalog/synonymes",
    label: "Synonymes",
    description: "Synonymes Meilisearch pour la recherche",
    icon: Search,
  },
];

export default function CatalogHubPage() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Catalogue</h1>
        <p className="text-slate-500 mt-1">
          Référentiels partagés (spécialités, villes, assurances, motifs, synonymes)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-5 h-5 text-teal-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {t.label}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
