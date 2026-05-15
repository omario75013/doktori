import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, labOrders, patients, doctors, labs, labUsers } from "@doktori/db";
import { eq, and, or } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, AlertCircle, FlaskConical } from "lucide-react";
import { OrderTabs } from "./order-tabs";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  collected: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function statusLabel(key: string) {
  switch (key) {
    case "pending": return "En attente";
    case "collected": return "Prélèvement effectué";
    case "completed": return "Complétée";
    case "cancelled": return "Annulée";
    default: return key;
  }
}

export default async function LaboratoireOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (role !== "lab" && role !== "lab_user")) {
    redirect("/laboratoire-login");
  }
  const labId = role === "lab_user"
    ? (session.user as { labId?: string }).labId!
    : session.user.id;

  const { id } = await params;

  // Fetch order with patient + doctor
  const rows = await db
    .select({
      id: labOrders.id,
      status: labOrders.status,
      urgency: labOrders.urgency,
      tests: labOrders.tests,
      instructions: labOrders.instructions,
      createdAt: labOrders.createdAt,
      completedAt: labOrders.completedAt,
      internalRef: labOrders.internalRef,
      specimenCollectedAt: labOrders.specimenCollectedAt,
      expectedResultAt: labOrders.expectedResultAt,
      resultUploadedAt: labOrders.resultUploadedAt,
      resultSummary: labOrders.resultSummary,
      technicianId: labOrders.technicianId,
      accessToken: labOrders.accessToken,
      // Patient fields
      patientId: patients.id,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientCin: patients.cin,
      patientDob: patients.dateOfBirth,
      patientGender: patients.gender,
      // Doctor
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorPhone: doctors.phone,
      doctorSpecialty: doctors.specialty,
      doctorEmail: doctors.email,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      and(
        eq(labOrders.id, id),
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId))
      )
    );

  const order = rows[0];
  if (!order) notFound();

  // Fetch lab kind (lab vs radiology)
  const [labRow] = await db.select({ kind: labs.kind }).from(labs).where(eq(labs.id, labId)).limit(1);
  const labKind = (labRow?.kind ?? "lab") as "lab" | "radiology";

  // Fetch lab users for technician picker
  const technicianList = await db
    .select({ id: labUsers.id, firstName: labUsers.firstName, lastName: labUsers.lastName, role: labUsers.role })
    .from(labUsers)
    .where(and(eq(labUsers.labId, labId), eq(labUsers.isActive, true)));

  const tests = Array.isArray(order.tests)
    ? (order.tests as { code?: string; label?: string }[])
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/laboratoire/commandes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        Retour aux commandes
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          <h1 className="text-2xl font-black text-foreground">
            {labKind === "radiology" ? "Demande d'imagerie" : "Commande d'analyses"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {order.urgency === "urgent" && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              Urgent
            </span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {statusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Tabbed UI */}
      <OrderTabs
        order={{
          id: order.id,
          status: order.status,
          urgency: order.urgency,
          tests,
          instructions: order.instructions ?? null,
          createdAt: order.createdAt.toISOString(),
          completedAt: order.completedAt?.toISOString() ?? null,
          internalRef: order.internalRef ?? null,
          specimenCollectedAt: order.specimenCollectedAt?.toISOString() ?? null,
          expectedResultAt: order.expectedResultAt?.toISOString() ?? null,
          resultUploadedAt: order.resultUploadedAt?.toISOString() ?? null,
          resultSummary: order.resultSummary ?? null,
          technicianId: order.technicianId ?? null,
          accessToken: order.accessToken,
        }}
        patient={{
          id: order.patientId,
          name: order.patientName,
          phone: order.patientPhone,
          email: order.patientEmail ?? null,
          cin: order.patientCin ?? null,
          dob: order.patientDob ?? null,
          gender: order.patientGender ?? null,
        }}
        doctor={{
          id: order.doctorId,
          name: order.doctorName,
          phone: order.doctorPhone,
          specialty: order.doctorSpecialty,
          email: order.doctorEmail,
        }}
        labKind={labKind}
        technicians={technicianList.map((t) => ({
          id: t.id,
          name: `${t.firstName} ${t.lastName}`,
          role: t.role,
        }))}
      />
    </div>
  );
}
