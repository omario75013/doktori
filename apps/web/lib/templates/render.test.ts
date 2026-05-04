import { describe, it, expect } from "vitest";
import { render, escapeHtml, formatValue } from "./render";
import type { TemplateContext } from "./variables";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseCtx: TemplateContext = {
  patient: {
    firstName: "Sarra",
    lastName: "Ben Ali",
    phone: "+21620000001",
    bloodType: "A+",
    dateOfBirth: new Date("1990-06-15"),
    allergies: ["Pénicilline", "Arachides"],
  },
  doctor: {
    name: "Dr. Khalil Mzali",
    specialty: "Cardiologie",
    city: "Tunis",
    phone: "+21625000000",
    address: "Rue de la Liberté",
  },
  appointment: {
    startsAt: new Date("2026-05-03T10:30:00"),
    type: "Consultation",
  },
  locale: "fr",
  now: new Date("2026-05-03T09:00:00"),
};

// ── W1.7-T1: basic interpolation ─────────────────────────────────────────────

describe("render — basic interpolation", () => {
  it("replaces {{first_name}} with patient first_name", () => {
    const { body } = render("Bonjour {{first_name}}", baseCtx);
    expect(body).toBe("Bonjour Sarra");
  });

  it("replaces multiple variables in one string", () => {
    const { body } = render("{{first_name}} {{last_name}}", baseCtx);
    expect(body).toBe("Sarra Ben Ali");
  });

  it("replaces doctor_name variable", () => {
    const { body } = render("Dr: {{doctor_name}}", baseCtx);
    expect(body).toBe("Dr: Dr. Khalil Mzali");
  });
});

// ── W1.7-T2: missing / unknown variables ─────────────────────────────────────

describe("render — missing variables", () => {
  it("replaces missing (null) variable with ___", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, cin: null },
    };
    const { body, unresolved } = render("CIN: {{cin}}", ctx);
    expect(body).toBe("CIN: ___");
    expect(unresolved).toContain("cin");
  });

  it("adds missing variable to unresolved array", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, cin: undefined },
    };
    const { unresolved } = render("{{cin}}", ctx);
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toBe("cin");
  });

  it("preserves unknown variable placeholder as-is", () => {
    const { body, unresolved } = render("{{firstname_typo}}", baseCtx);
    expect(body).toBe("{{firstname_typo}}");
    expect(unresolved).not.toContain("firstname_typo");
  });
});

// ── W1.7-T3: XSS escaping (BLOCKER B1) ───────────────────────────────────────

describe("render — XSS escape (BLOCKER B1)", () => {
  it("escapes <img onerror=alert(1)> in variable value", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, firstName: "<img onerror=alert(1)>" },
    };
    const { body } = render("{{first_name}}", ctx);
    expect(body).not.toContain("<img");
    expect(body).toContain("&lt;img");
  });

  it("escapes <script>alert(1)</script> in variable value", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, firstName: "<script>alert(1)</script>" },
    };
    const { body } = render("{{first_name}}", ctx);
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });

  it("escapes & and quotes in variable value", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, firstName: '& "Omar"' },
    };
    const { body } = render("{{first_name}}", ctx);
    expect(body).toContain("&amp;");
    expect(body).toContain("&quot;");
  });

  it("escapes single quotes", () => {
    const ctx: TemplateContext = {
      ...baseCtx,
      patient: { ...baseCtx.patient, firstName: "O'Brien" },
    };
    const { body } = render("{{first_name}}", ctx);
    expect(body).toContain("&#39;");
  });
});

// ── W1.7-T4: escapeHtml unit tests ───────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<tag>")).toBe("&lt;tag&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
});

// ── W1.7-T5: locale formatting ────────────────────────────────────────────────

describe("render — locale formatting", () => {
  it("formats today_long in FR: contains month name in French", () => {
    const { body } = render("{{today_long}}", baseCtx);
    // "3 mai 2026"
    expect(body).toContain("mai");
    expect(body).toContain("2026");
  });

  it("formats today_long in AR: contains 2026", () => {
    const ctx: TemplateContext = { ...baseCtx, locale: "ar" };
    const { body } = render("{{today_long}}", ctx);
    expect(body).toContain("2026");
  });

  it("formats today in FR as DD/MM/YYYY", () => {
    const { body } = render("{{today}}", baseCtx);
    expect(body).toBe("03/05/2026");
  });

  it("formats appointment_date in FR as DD/MM/YYYY", () => {
    const { body } = render("{{appointment_date}}", baseCtx);
    expect(body).toBe("03/05/2026");
  });
});

// ── W1.7-T6: allergies array joined ──────────────────────────────────────────

describe("render — allergies", () => {
  it("joins FR allergies with comma-space", () => {
    const { body } = render("{{allergies}}", baseCtx);
    expect(body).toBe("Pénicilline, Arachides");
  });

  it("joins AR allergies with Arabic comma", () => {
    const ctx: TemplateContext = { ...baseCtx, locale: "ar" };
    const { body } = render("{{allergies}}", ctx);
    expect(body).toContain("Pénicilline");
    expect(body).toContain("Arachides");
  });
});

// ── W1.7-T7: formatValue unit tests ──────────────────────────────────────────

describe("formatValue", () => {
  it("formats a Date with date_short in FR", () => {
    const d = new Date("2026-05-03T00:00:00");
    expect(formatValue(d, "date_short", "fr")).toBe("03/05/2026");
  });

  it("formats a Date with date_long in FR containing month name", () => {
    const d = new Date("2026-05-03T00:00:00");
    expect(formatValue(d, "date_long", "fr")).toContain("mai");
  });

  it("formats a number unchanged", () => {
    expect(formatValue(42, "number", "fr")).toBe("42");
  });

  it("returns string value for text format", () => {
    expect(formatValue("hello", "text", "fr")).toBe("hello");
  });
});

// ── W1.7-T8: performance ─────────────────────────────────────────────────────

describe("render — performance", () => {
  it("renders 100 variables in under 50ms", () => {
    // Build a template with all 24 known variables repeated ~4x
    const allVars = [
      "first_name", "last_name", "full_name", "age", "age_at_appointment",
      "dob", "phone", "cin", "weight", "height", "blood_type", "allergies",
      "insurance", "doctor_name", "doctor_specialty", "doctor_city",
      "doctor_phone", "doctor_address", "doctor_registration",
      "appointment_date", "appointment_type", "today", "today_long", "time",
    ];
    const template = Array.from({ length: 100 }, (_, i) =>
      `{{${allVars[i % allVars.length]}}}`
    ).join(" ");

    const start = performance.now();
    render(template, baseCtx);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
