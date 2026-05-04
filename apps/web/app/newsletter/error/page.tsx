import Link from "next/link";

export const metadata = {
  title: "Lien invalide | Doktori",
  robots: { index: false, follow: false },
};

export default function NewsletterErrorPage() {
  return (
    <main className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
          ⚠
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Lien invalide ou expiré</h1>
        <p className="text-muted-foreground mb-6">
          Ce lien n&apos;est plus valide. Vous pouvez vous inscrire à nouveau depuis la page d&apos;accueil.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
