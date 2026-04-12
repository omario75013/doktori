import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { TeleconsultSettings } from "./teleconsult-settings";

export default async function TeleconsultationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const doctorId = session.user.id;

  // Fetch consultation_mode and teleconsult_fee from doctors table (added by schema agent)
  const doctorRows = await db.execute(
    sql`SELECT consultation_mode, teleconsult_fee, consultation_fee FROM doctors WHERE id = ${doctorId} LIMIT 1`
  );

  const doctor = doctorRows.rows[0] as {
    consultation_mode: string | null;
    teleconsult_fee: number | null;
    consultation_fee: number | null;
  } | undefined;

  const initialMode = (doctor?.consultation_mode ?? "cabinet") as
    | "cabinet"
    | "teleconsult"
    | "both";
  const initialTeleconsultFee = doctor?.teleconsult_fee ?? null;
  const consultationFee = doctor?.consultation_fee ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Téléconsultation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configurez votre mode de consultation et vos tarifs de téléconsultation.
        </p>
      </div>

      <TeleconsultSettings
        initialMode={initialMode}
        initialTeleconsultFee={initialTeleconsultFee}
        consultationFee={consultationFee}
      />
    </div>
  );
}
