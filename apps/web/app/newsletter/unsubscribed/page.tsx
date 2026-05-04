import Link from "next/link";

export const metadata = {
  title: "Désinscription confirmée | Doktori",
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribedPage() {
  return (
    <main className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-3xl">
          👋
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Vous êtes désinscrit(e)</h1>
        <p className="text-muted-foreground mb-6">
          Vous ne recevrez plus d&apos;emails de notre part. Vous pouvez vous réinscrire à tout moment.
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
