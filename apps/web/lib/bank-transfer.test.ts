import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { db, doctorPaymentMethods, bankTransferIntents, appointments, doctors, patients, adminUsers, walletTransactions } = await import("@doktori/db");
const { eq, and } = await import("drizzle-orm");
const { createBankTransferIntent, confirmBankTransfer, rejectBankTransfer } = await import("./bank-transfer");

let testDoctorId: string;
let testPatientId: string;
let testAdminId: string;
let testAppointmentId: string;

beforeAll(async () => {
  // Seed minimal fixtures
  const [doc] = await db.insert(doctors).values({
    name: "Test Bank Doctor",
    slug: `bank-test-${Date.now()}`,
    email: `bank-${Date.now()}@test.local`,
    passwordHash: "$2a$04$fake",
    phone: "00000000",
    specialty: "generaliste",
    city: "Tunis",
    address: "test",
  }).returning({ id: doctors.id });
  testDoctorId = doc.id;

  const [pat] = await db.insert(patients).values({
    name: "Test Bank Patient",
    phone: `+216${Math.floor(Math.random() * 10000000).toString().padStart(7, "0")}`,
  }).returning({ id: patients.id });
  testPatientId = pat.id;

  const [adm] = await db.insert(adminUsers).values({
    email: `admin-bank-${Date.now()}@test.local`,
    passwordHash: "$2a$04$fake",
    name: "Test Bank Admin",
    role: "super_admin",
  }).returning({ id: adminUsers.id });
  testAdminId = adm.id;

  const [appt] = await db.insert(appointments).values({
    doctorId: testDoctorId,
    patientId: testPatientId,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 30 * 60_000),
  }).returning({ id: appointments.id });
  testAppointmentId = appt.id;
});

beforeEach(async () => {
  // Reset doctor's bank transfer config + clear any prior intents for this doctor
  await db.delete(doctorPaymentMethods).where(eq(doctorPaymentMethods.doctorId, testDoctorId));
  await db.delete(bankTransferIntents).where(eq(bankTransferIntents.doctorId, testDoctorId));
  await db.delete(walletTransactions).where(eq(walletTransactions.doctorId, testDoctorId));
});

describe("createBankTransferIntent", () => {
  it("throws if doctor has no bank_transfer method enabled", async () => {
    await expect(createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    })).rejects.toThrow("not enabled bank transfer");
  });

  it("throws if config is incomplete", async () => {
    await db.insert(doctorPaymentMethods).values({
      doctorId: testDoctorId,
      method: "bank_transfer",
      enabled: true,
      config: { iban: "TN..." }, // missing bankName + accountHolder
    });
    await expect(createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    })).rejects.toThrow("incomplete");
  });

  it("creates intent + returns reference + bank config + expiresAt", async () => {
    await db.insert(doctorPaymentMethods).values({
      doctorId: testDoctorId,
      method: "bank_transfer",
      enabled: true,
      config: { iban: "TN5904012345678901234567", bic: "BSTNTNTT", bankName: "Banque Centrale", accountHolder: "Dr Test" },
    });
    const result = await createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    });
    expect(result.reference).toMatch(/^DK[A-Z2-9]{10}$/);
    expect(result.amount).toBe(50000);
    expect(result.bankConfig.iban).toBe("TN5904012345678901234567");
    expect(result.bankConfig.bankName).toBe("Banque Centrale");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86400_000);
    // Verify in DB
    const [row] = await db.select().from(bankTransferIntents).where(eq(bankTransferIntents.id, result.intentId)).limit(1);
    expect(row.status).toBe("pending");
    expect(row.reference).toBe(result.reference);
  });
});

describe("confirmBankTransfer", () => {
  beforeEach(async () => {
    await db.insert(doctorPaymentMethods).values({
      doctorId: testDoctorId,
      method: "bank_transfer",
      enabled: true,
      config: { iban: "TN5904012345678901234567", bic: "BSTNTNTT", bankName: "Banque Centrale", accountHolder: "Dr Test" },
    });
  });

  it("marks intent confirmed + appointment paid + creates wallet transaction", async () => {
    const intent = await createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    });
    await confirmBankTransfer({ intentId: intent.intentId, adminId: testAdminId });

    const [row] = await db.select().from(bankTransferIntents).where(eq(bankTransferIntents.id, intent.intentId)).limit(1);
    expect(row.status).toBe("confirmed");
    expect(row.confirmedByAdminId).toBe(testAdminId);

    // Wallet transaction was created
    const wallets = await db.select().from(walletTransactions).where(and(
      eq(walletTransactions.doctorId, testDoctorId),
      eq(walletTransactions.appointmentId, testAppointmentId)
    ));
    expect(wallets.length).toBeGreaterThanOrEqual(1);
    expect(wallets[0].amount).toBe(50000);
    expect(wallets[0].type).toBe("credit");
  });

  it("is idempotent (calling twice does not double-credit)", async () => {
    const intent = await createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    });
    await confirmBankTransfer({ intentId: intent.intentId, adminId: testAdminId });
    await confirmBankTransfer({ intentId: intent.intentId, adminId: testAdminId }); // second call no-op
    const wallets = await db.select().from(walletTransactions).where(and(
      eq(walletTransactions.doctorId, testDoctorId),
      eq(walletTransactions.appointmentId, testAppointmentId)
    ));
    expect(wallets.length).toBe(1); // not 2
  });
});

describe("rejectBankTransfer", () => {
  it("marks intent rejected without crediting wallet", async () => {
    await db.insert(doctorPaymentMethods).values({
      doctorId: testDoctorId,
      method: "bank_transfer",
      enabled: true,
      config: { iban: "TN5904012345678901234567", bic: "BSTNTNTT", bankName: "Banque Centrale", accountHolder: "Dr Test" },
    });
    const intent = await createBankTransferIntent({
      appointmentId: testAppointmentId,
      patientId: testPatientId,
      doctorId: testDoctorId,
      amount: 50000,
      expiryDays: 7,
    });
    await rejectBankTransfer({ intentId: intent.intentId, adminId: testAdminId, reason: "Proof unclear" });
    const [row] = await db.select().from(bankTransferIntents).where(eq(bankTransferIntents.id, intent.intentId)).limit(1);
    expect(row.status).toBe("rejected");
    expect(row.rejectedReason).toBe("Proof unclear");
    // No wallet transaction
    const wallets = await db.select().from(walletTransactions).where(and(
      eq(walletTransactions.doctorId, testDoctorId),
      eq(walletTransactions.appointmentId, testAppointmentId)
    ));
    expect(wallets.length).toBe(0);
  });
});
