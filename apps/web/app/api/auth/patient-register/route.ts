import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { hash } from "bcryptjs";
import { db, patients } from "@doktori/db";
import { eq, or } from "drizzle-orm";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    password?: string;
    dateOfBirth?: string;
  } | null;

  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const phone = body?.phone?.trim();
  const email = body?.email?.trim().toLowerCase() || null;
  const password = body?.password;
  const dateOfBirth = body?.dateOfBirth?.trim() || null;

  if (!firstName || !lastName || !phone || !password) {
    return NextResponse.json(
      { error: "firstName, lastName, phone, password requis" },
      { status: 400 }
    );
  }

  // Check duplicates
  const conditions = [eq(patients.phone, phone)];
  if (email) conditions.push(eq(patients.email, email));
  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(or(...conditions))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec ce téléphone ou cet email" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 10);

  // Parse DD/MM/YYYY → ISO date string
  let parsedDob: string | null = null;
  if (dateOfBirth) {
    const parts = dateOfBirth.split("/");
    if (parts.length === 3) {
      parsedDob = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  const [patient] = await db
    .insert(patients)
    .values({
      name: `${firstName} ${lastName}`,
      phone,
      email,
      passwordHash,
      dateOfBirth: parsedDob,
      authMethod: "password",
    })
    .returning();

  const token = sign(
    { id: patient.id, phone: patient.phone, role: "patient" },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "30d" }
  );

  return NextResponse.json({
    token,
    user: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email ?? null,
      role: "patient",
    },
  });
}
