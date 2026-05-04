import { describe, it, expect } from "vitest";
import { buildExportZip, type ExportData } from "./data-export";
import { unzipSync, strFromU8 } from "fflate";

const sampleData: ExportData = {
  profile: { id: "123", name: "Ahmed Ben Ali", phone: "+21699000000", email: "ahmed@example.com" },
  appointments: [
    { id: "appt-1", startsAt: "2026-01-15T09:00:00Z", status: "completed", doctorId: "doc-1" },
  ],
  prescriptions: [
    { id: "rx-1", appointmentId: "appt-1", content: "Doliprane 500mg", createdAt: "2026-01-15T09:30:00Z" },
  ],
  messages: [
    { id: "msg-1", conversationId: "conv-1", senderType: "patient", content: "Bonjour docteur", createdAt: "2026-01-10T08:00:00Z" },
  ],
  notifications: [
    { id: "notif-1", type: "reminder", title: "Rappel RDV", createdAt: "2026-01-14T10:00:00Z" },
  ],
  consents: [
    { id: "consent-1", consentType: "cookies_analytics", granted: true, grantedAt: "2026-01-01T00:00:00Z" },
  ],
};

describe("buildExportZip", () => {
  it("returns a non-empty Uint8Array", () => {
    const zip = buildExportZip(sampleData);
    expect(zip).toBeInstanceOf(Uint8Array);
    expect(zip.byteLength).toBeGreaterThan(0);
  });

  it("produces a valid ZIP containing expected files", () => {
    const zip = buildExportZip(sampleData);
    const extracted = unzipSync(zip);
    const fileNames = Object.keys(extracted);

    expect(fileNames).toContain("profile.json");
    expect(fileNames).toContain("rendez-vous.csv");
    expect(fileNames).toContain("ordonnances.csv");
    expect(fileNames).toContain("messages.csv");
    expect(fileNames).toContain("notifications.json");
    expect(fileNames).toContain("consentements.json");
    expect(fileNames).toContain("README.txt");
  });

  it("profile.json contains the patient name", () => {
    const zip = buildExportZip(sampleData);
    const extracted = unzipSync(zip);
    const profile = JSON.parse(strFromU8(extracted["profile.json"]));
    expect(profile.name).toBe("Ahmed Ben Ali");
  });

  it("rendez-vous.csv has a header row and one data row", () => {
    const zip = buildExportZip(sampleData);
    const extracted = unzipSync(zip);
    const csv = strFromU8(extracted["rendez-vous.csv"]);
    const lines = csv.split("\n").filter(Boolean);
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[0]).toContain("id");
  });

  it("handles empty arrays gracefully", () => {
    const emptyData: ExportData = {
      ...sampleData,
      appointments: [],
      prescriptions: [],
      messages: [],
    };
    const zip = buildExportZip(emptyData);
    const extracted = unzipSync(zip);
    const csv = strFromU8(extracted["rendez-vous.csv"]);
    expect(csv).toBe("");
  });

  it("escapes CSV fields that contain commas", () => {
    const dataWithComma: ExportData = {
      ...sampleData,
      appointments: [
        { id: "appt-1", reason: "Douleur, fatigue", status: "completed" },
      ],
    };
    const zip = buildExportZip(dataWithComma);
    const extracted = unzipSync(zip);
    const csv = strFromU8(extracted["rendez-vous.csv"]);
    expect(csv).toContain('"Douleur, fatigue"');
  });
});
