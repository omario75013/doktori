import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API publique — Documentation | Doktori",
  description:
    "Documentation de l'API publique Doktori en lecture seule : médecins, spécialités, villes, disponibilités.",
  robots: { index: true, follow: true },
};

const ENDPOINTS: Array<{
  method: string;
  path: string;
  scope: string;
  desc: string;
  example: string;
}> = [
  {
    method: "GET",
    path: "/api/v1/public/doctors",
    scope: "read:doctors",
    desc: "Liste paginée des médecins actifs et vérifiés. Filtres : city, specialty, q.",
    example:
      "curl -H 'Authorization: Bearer dok_xxx' 'https://doktori.tn/api/v1/public/doctors?city=tunis&specialty=generaliste&limit=10'",
  },
  {
    method: "GET",
    path: "/api/v1/public/doctors/{slug}",
    scope: "read:doctors",
    desc: "Profil public d'un médecin par son slug.",
    example: "curl -H 'Authorization: Bearer dok_xxx' 'https://doktori.tn/api/v1/public/doctors/dr-ben-ali-generaliste-tunis'",
  },
  {
    method: "GET",
    path: "/api/v1/public/specialties",
    scope: "read:specialties",
    desc: "Catalogue des spécialités médicales (FR + AR).",
    example: "curl -H 'Authorization: Bearer dok_xxx' 'https://doktori.tn/api/v1/public/specialties'",
  },
  {
    method: "GET",
    path: "/api/v1/public/cities",
    scope: "read:cities",
    desc: "Catalogue des villes Tunisie (FR + AR + coordonnées GPS).",
    example: "curl -H 'Authorization: Bearer dok_xxx' 'https://doktori.tn/api/v1/public/cities'",
  },
  {
    method: "GET",
    path: "/api/v1/public/availability/{slug}",
    scope: "read:availability",
    desc: "Créneaux disponibles pour un médecin (max 14 jours). Params : from=YYYY-MM-DD, days=7.",
    example:
      "curl -H 'Authorization: Bearer dok_xxx' 'https://doktori.tn/api/v1/public/availability/dr-ben-ali-generaliste-tunis?days=7'",
  },
];

export default function ApiDocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-600">API Doktori</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-black text-slate-900">
          API publique en lecture seule
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Intégrez l&apos;annuaire Doktori dans votre application : médecins, spécialités, villes,
          disponibilités. Authentification par clé API, rate-limit par défaut 60 req/min.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Authentification</h2>
        <p className="text-slate-700 mb-3">
          Toutes les requêtes doivent inclure votre clé API dans l&apos;en-tête :
        </p>
        <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto">
          <code>Authorization: Bearer dok_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
        </pre>
        <p className="text-sm text-slate-600 mt-3">
          Demandez votre clé en envoyant un email à{" "}
          <a href="mailto:api@doktori.tn" className="text-teal-600 font-semibold underline">
            api@doktori.tn
          </a>{" "}
          avec votre nom, votre cas d&apos;usage, et le volume estimé.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Endpoints</h2>
        <div className="space-y-4">
          {ENDPOINTS.map((ep) => (
            <article key={ep.path} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-slate-900">{ep.path}</code>
                <code className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-auto">
                  scope: {ep.scope}
                </code>
              </div>
              <p className="text-sm text-slate-700 mb-3">{ep.desc}</p>
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto">
                <code>{ep.example}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Limites & codes d&apos;erreur</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <strong className="text-slate-900">401</strong> — clé manquante, invalide ou expirée.
          </li>
          <li>
            <strong className="text-slate-900">403</strong> — votre clé n&apos;a pas le scope requis.
          </li>
          <li>
            <strong className="text-slate-900">429</strong> — rate limit dépassé. Voir les en-têtes{" "}
            <code className="text-xs">X-RateLimit-Remaining</code> et{" "}
            <code className="text-xs">X-RateLimit-Reset</code>.
          </li>
          <li>
            <strong className="text-slate-900">404</strong> — ressource introuvable (slug invalide,
            par exemple).
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Données & RGPD</h2>
        <p className="text-sm text-slate-700">
          Cette API ne retourne que des données publiques (nom, spécialité, adresse cabinet, photo,
          biographie, langues, tarifs). Aucune donnée patient ni email/téléphone du médecin
          n&apos;est exposée. Voir notre{" "}
          <Link href="/legal/privacy" className="text-teal-600 underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
