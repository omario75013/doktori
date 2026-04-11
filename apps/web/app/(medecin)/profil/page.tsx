import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const [doctor] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) redirect("/connexion");

  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <div className="bg-white rounded-xl border p-6 max-w-lg space-y-3 text-sm">
        <div>
          <span className="text-gray-500">Nom:</span>{" "}
          <span className="font-medium">{doctor.name}</span>
        </div>
        <div>
          <span className="text-gray-500">Email:</span>{" "}
          <span className="font-medium">{doctor.email}</span>
        </div>
        <div>
          <span className="text-gray-500">Téléphone:</span>{" "}
          <span className="font-medium">{doctor.phone}</span>
        </div>
        <div>
          <span className="text-gray-500">Spécialité:</span>{" "}
          <span className="font-medium">{specialty?.label}</span>
        </div>
        <div>
          <span className="text-gray-500">Ville:</span>{" "}
          <span className="font-medium">{city?.label}</span>
        </div>
        <div>
          <span className="text-gray-500">Adresse:</span>{" "}
          <span className="font-medium">{doctor.address}</span>
        </div>
        {doctor.consultationFee && (
          <div>
            <span className="text-gray-500">Tarif:</span>{" "}
            <span className="font-medium">{doctor.consultationFee / 1000} DT</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-4">{"L'édition du profil arrive bientôt."}</p>
    </div>
  );
}
