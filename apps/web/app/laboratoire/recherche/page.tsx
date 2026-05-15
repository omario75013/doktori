import { Suspense } from "react";
import { Search } from "lucide-react";
import { RechercheContent } from "./recherche-content";

export default function LaboratoireRecherchePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
        <Search className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
        Recherche
      </h1>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
        <RechercheContent />
      </Suspense>
    </div>
  );
}
