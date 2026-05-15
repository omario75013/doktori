import { requireClinic } from "@/lib/clinic-auth";
import { redirect } from "next/navigation";
import { db, clinicSites } from "@doktori/db";
import { eq, asc, desc } from "drizzle-orm";
import { Building, MapPin } from "lucide-react";
import { SitesClient } from "./sites-client";

export default async function SitesPage() {
  const clinic = await requireClinic();
  if (clinic instanceof Response) redirect("/clinique-login");

  const sites = await db
    .select()
    .from(clinicSites)
    .where(eq(clinicSites.clinicId, (clinic as { id: string }).id))
    .orderBy(desc(clinicSites.isPrimary), asc(clinicSites.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center">
            <Building className="h-5 w-5 text-cyan-700" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Sites</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les adresses physiques de votre établissement.
            </p>
          </div>
        </div>
      </div>

      {sites.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center bg-white">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun site configuré pour le moment.
          </p>
        </div>
      )}

      <SitesClient initialSites={sites} />
    </div>
  );
}
