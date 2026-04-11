import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ParcoursEditor } from "./parcours-editor";

export default async function ParcoursPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const [doctor] = await db
    .select({
      id: doctors.id,
      educations: doctors.educations,
      experiences: doctors.experiences,
      languages: doctors.languages,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
    })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) redirect("/connexion");

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mon parcours</h1>
        <Link href="/profil" className="text-sm text-teal-600 hover:underline">
          ← Retour au profil
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Complétez votre parcours pour rassurer vos patients. Ces informations
        apparaissent sur votre page publique.
      </p>
      <ParcoursEditor
        initial={{
          educations: doctor.educations ?? [],
          experiences: doctor.experiences ?? [],
          languages: doctor.languages ?? [],
          expertise: doctor.expertise ?? [],
          yearsOfExperience: doctor.yearsOfExperience ?? null,
        }}
      />
    </div>
  );
}
