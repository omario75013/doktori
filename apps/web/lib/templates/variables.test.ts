import { describe, it, expect } from "vitest";
import {
  TEMPLATE_VARIABLES,
  resolveVariable,
  computeAge,
  type TemplateContext,
} from "./variables";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const basePatient: TemplateContext["patient"] = {
  firstName: "Sarra",
  lastName: "Ben Ali",
  phone: "+21620000001",
  cin: "12345678",
  dateOfBirth: new Date("1990-06-15"),
  weightKg: "65.5",
  heightCm: 170,
  bloodType: "A+",
  insuranceProvider: "CNSS",
};

const baseDoctor: TemplateContext["doctor"] = {
  name: "Dr. Khalil Mzali",
  specialty: "Cardiologie",
  city: "Tunis",
  phone: "+21625000000",
  address: "Rue de la Liberté, Tunis",
  registrationNumber: "12345",
};

const basePractice: TemplateContext["practice"] = {
  address: "Clinique El Manar, Bloc B",
  city: "Ariana",
  phone: "+21671000000",
};

const baseAppointment: TemplateContext["appointment"] = {
  startsAt: new Date("2026-05-03T10:30:00"),
  type: "Consultation",
};

const baseCtx: TemplateContext = {
  patient: basePatient,
  doctor: baseDoctor,
  practice: basePractice,
  appointment: baseAppointment,
  locale: "fr",
  now: new Date("2026-05-03T09:00:00"),
};

// ── W1.6-T1: registry size ────────────────────────────────────────────────────

describe("TEMPLATE_VARIABLES registry", () => {
  it("has exactly 24 variables", () => {
    expect(Object.keys(TEMPLATE_VARIABLES)).toHaveLength(24);
  });

  it("contains all patient variable keys", () => {
    const patientKeys = [
      "first_name",
      "last_name",
      "full_name",
      "age",
      "age_at_appointment",
      "dob",
      "phone",
      "cin",
      "weight",
      "height",
      "blood_type",
      "allergies",
      "insurance",
    ];
    for (const key of patientKeys) {
      expect(TEMPLATE_VARIABLES).toHaveProperty(key);
    }
  });

  it("contains all doctor variable keys", () => {
    const doctorKeys = [
      "doctor_name",
      "doctor_specialty",
      "doctor_city",
      "doctor_phone",
      "doctor_address",
      "doctor_registration",
    ];
    for (const key of doctorKeys) {
      expect(TEMPLATE_VARIABLES).toHaveProperty(key);
    }
  });

  it("contains all appointment variable keys", () => {
    expect(TEMPLATE_VARIABLES).toHaveProperty("appointment_date");
    expect(TEMPLATE_VARIABLES).toHaveProperty("appointment_type");
  });

  it("contains all system variable keys", () => {
    expect(TEMPLATE_VARIABLES).toHaveProperty("today");
    expect(TEMPLATE_VARIABLES).toHaveProperty("today_long");
    expect(TEMPLATE_VARIABLES).toHaveProperty("time");
  });
});

// ── W1.6-T2: resolveVariable — basic fields ───────────────────────────────────

describe("resolveVariable", () => {
  it("resolves first_name", () => {
    expect(resolveVariable("first_name", baseCtx)).toBe("Sarra");
  });

  it("resolves last_name", () => {
    expect(resolveVariable("last_name", baseCtx)).toBe("Ben Ali");
  });

  it("resolves full_name by combining first and last", () => {
    expect(resolveVariable("full_name", baseCtx)).toBe("Sarra Ben Ali");
  });

  it("resolves doctor_name", () => {
    expect(resolveVariable("doctor_name", baseCtx)).toBe("Dr. Khalil Mzali");
  });

  it("resolves doctor_specialty", () => {
    expect(resolveVariable("doctor_specialty", baseCtx)).toBe("Cardiologie");
  });

  it("resolves appointment_type", () => {
    expect(resolveVariable("appointment_type", baseCtx)).toBe("Consultation");
  });

  it("resolves phone", () => {
    expect(resolveVariable("phone", baseCtx)).toBe("+21620000001");
  });

  it("resolves cin", () => {
    expect(resolveVariable("cin", baseCtx)).toBe("12345678");
  });

  it("resolves blood_type", () => {
    expect(resolveVariable("blood_type", baseCtx)).toBe("A+");
  });

  it("resolves insurance", () => {
    expect(resolveVariable("insurance", baseCtx)).toBe("CNSS");
  });

  it("resolves height", () => {
    expect(resolveVariable("height", baseCtx)).toBe(170);
  });

  it("resolves weight", () => {
    expect(resolveVariable("weight", baseCtx)).toBe("65.5");
  });
});

// ── W1.6-T3: computed — age ───────────────────────────────────────────────────

describe("resolveVariable — age (computed)", () => {
  it("computes age correctly when birthday already passed this year", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, dateOfBirth: new Date("1990-01-01") },
      now: new Date("2026-05-03T00:00:00"),
    };
    expect(resolveVariable("age", ctx)).toBe(36);
  });

  it("computes age correctly when birthday is still upcoming this year", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, dateOfBirth: new Date("1990-12-31") },
      now: new Date("2026-05-03T00:00:00"),
    };
    expect(resolveVariable("age", ctx)).toBe(35);
  });
});

// ── W1.6-T4: age_at_appointment differs from age ──────────────────────────────

describe("resolveVariable — age_at_appointment", () => {
  it("uses appointment date as reference for age calculation", () => {
    // Patient born 1990-06-15; appointment 2026-05-03; current date 2026-12-01
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, dateOfBirth: new Date("1990-06-15") },
      appointment: { ...baseAppointment, startsAt: new Date("2026-05-03T10:30:00") },
      now: new Date("2026-12-01T00:00:00"),
    };
    // age at appointment: not yet 36 (birthday June 15), so 35
    expect(resolveVariable("age_at_appointment", ctx)).toBe(35);
    // current age on Dec 1: already 36
    expect(resolveVariable("age", ctx)).toBe(36);
  });

  it("equals age when appointment is today", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, dateOfBirth: new Date("1990-01-01") },
      appointment: { ...baseAppointment, startsAt: new Date("2026-05-03T10:30:00") },
      now: new Date("2026-05-03T00:00:00"),
    };
    expect(resolveVariable("age_at_appointment", ctx)).toBe(
      resolveVariable("age", ctx)
    );
  });
});

// ── W1.6-T5: null guards ──────────────────────────────────────────────────────

describe("resolveVariable — null guards", () => {
  it("returns null when patient is missing", () => {
    const ctx: TemplateContext = { ...baseCtx, patient: undefined };
    expect(resolveVariable("first_name", ctx)).toBeNull();
  });

  it("returns null when dob is null for age", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, dateOfBirth: null },
    };
    expect(resolveVariable("age", ctx)).toBeNull();
  });

  it("returns null for unknown variable name", () => {
    expect(resolveVariable("unknown_var_xyz", baseCtx)).toBeNull();
  });
});

// ── W1.6-T6: allergies array join ─────────────────────────────────────────────

describe("resolveVariable — allergies", () => {
  it("joins string allergies as-is", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, allergies: "Pénicilline, Arachides" },
    };
    expect(resolveVariable("allergies", ctx)).toBe("Pénicilline, Arachides");
  });

  it("joins array allergies with comma", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, allergies: ["Pénicilline", "Arachides"] },
    };
    expect(resolveVariable("allergies", ctx)).toBe("Pénicilline, Arachides");
  });

  it("returns null when allergies is empty array", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...basePatient, allergies: [] },
    };
    expect(resolveVariable("allergies", ctx)).toBeNull();
  });
});

// ── W1.6-T7: computeAge helper ───────────────────────────────────────────────

describe("computeAge", () => {
  it("returns correct age when birthday passed", () => {
    expect(computeAge(new Date("1990-01-01"), new Date("2026-05-03"))).toBe(36);
  });

  it("returns correct age on exact birthday", () => {
    expect(computeAge(new Date("1990-05-03"), new Date("2026-05-03"))).toBe(36);
  });

  it("returns correct age when birthday not yet passed", () => {
    expect(computeAge(new Date("1990-12-25"), new Date("2026-05-03"))).toBe(35);
  });
});
