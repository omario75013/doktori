import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * V1 Bulletin de Soins (BS1) — CNAM Tunisia.
 *
 * The official BS1 form is a paper bulletin issued by the CNAM. Until the SEED
 * API is publicly available (planned 2027 per La Presse 2026-01), private
 * software cannot transmit BS1 electronically. Doctors print, sign, and either
 * give it to the patient or upload it via the e-CNAM portal.
 *
 * This generator produces a clean, A4, single-page form with the doctor /
 * patient / appointment data pre-filled. The doctor must verify and sign.
 *
 * Missing optional fields (e.g. the patient has no cnamNumber on file) are
 * rendered as a dotted blank zone so the doctor can fill it manually.
 */

export interface BulletinSoinsData {
  patient: {
    cnamNumber?: string | null;
    cnssNumber?: string | null;
    cnamRegime?: string | null;
    name: string;
    dateOfBirth?: Date | null;
    cin?: string | null;
  };
  doctor: {
    name: string;
    specialty: string;
    cnomCode?: string | null;
    address: string;
    cnamConventionCode?: string | null;
  };
  appointment: {
    id: string;
    date: Date;
    diagnosis?: string | null;
    consultationFee: number; // millimes
    treatments?: string | null;
  };
  practice?: {
    name: string;
    address: string;
    phone?: string | null;
  };
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 36;

const REGIME_LABELS: Record<string, string> = {
  cnss: "CNSS (salariés du privé)",
  cnrps: "CNRPS (fonction publique)",
  convention_etudiant: "Convention étudiant",
  convention_alaaliyah: "Convention Al Aaliyah",
  none: "Régime non précisé",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMillimes(millimes: number): string {
  return (millimes / 1000).toFixed(3).replace(".", ",") + " DT";
}

function shortBsNumber(appointmentId: string): string {
  // Stable short reference (8 hex chars, uppercase) for printable BS number.
  return "BS-" + appointmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Sanitize a string for pdf-lib's StandardFonts (WinAnsi only — drops
 * unsupported glyphs gracefully). The official form is in French and Arabic;
 * V1 only ships French. Arabic via embedded TTF is a 2027 follow-up.
 */
function safeText(s: string | null | undefined): string {
  if (!s) return "";
  // Replace common non-WinAnsi chars with WinAnsi-friendly equivalents.
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–|—/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    // Drop any remaining non-Latin1 characters (e.g. Arabic).
    .replace(/[^\x00-\xFF]/g, "");
}

function drawLabel(page: PDFPage, font: PDFFont, x: number, y: number, text: string, size = 9) {
  page.drawText(safeText(text), {
    x,
    y,
    size,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
}

function drawValue(page: PDFPage, font: PDFFont, x: number, y: number, text: string, size = 11) {
  page.drawText(safeText(text), {
    x,
    y,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
}

function drawDottedField(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  value: string | null | undefined,
) {
  // Underline for the field
  page.drawLine({
    start: { x, y: y - 2 },
    end: { x: x + width, y: y - 2 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
    dashArray: [1.5, 1.5],
  });
  if (value) {
    drawValue(page, font, x + 2, y, value, 11);
  }
}

function drawCheckbox(page: PDFPage, font: PDFFont, x: number, y: number, label: string, checked: boolean) {
  page.drawRectangle({
    x,
    y: y - 2,
    width: 10,
    height: 10,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.8,
    color: checked ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1),
  });
  if (checked) {
    page.drawText("X", {
      x: x + 2,
      y: y,
      size: 9,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  }
  drawValue(page, font, x + 14, y, label, 10);
}

function drawSectionHeader(
  page: PDFPage,
  fontBold: PDFFont,
  y: number,
  letter: string,
  title: string,
): void {
  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: A4_WIDTH - MARGIN * 2,
    height: 16,
    color: rgb(0.93, 0.95, 0.98),
    borderColor: rgb(0.7, 0.75, 0.82),
    borderWidth: 0.5,
  });
  page.drawText(safeText(`${letter}. ${title}`), {
    x: MARGIN + 6,
    y: y,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.45),
  });
}

export async function generateBulletinSoins(data: BulletinSoinsData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pdfDoc.setTitle(`Bulletin de Soins ${shortBsNumber(data.appointment.id)}`);
  pdfDoc.setAuthor("Doktori");
  pdfDoc.setSubject("Bulletin de Soins CNAM");
  pdfDoc.setProducer("Doktori");
  pdfDoc.setCreator("Doktori");
  pdfDoc.setCreationDate(new Date());

  // ── Header ─────────────────────────────────────────────────────────────────
  page.drawRectangle({
    x: MARGIN,
    y: A4_HEIGHT - MARGIN - 56,
    width: A4_WIDTH - MARGIN * 2,
    height: 56,
    borderColor: rgb(0.15, 0.25, 0.45),
    borderWidth: 1,
  });

  page.drawText("REPUBLIQUE TUNISIENNE", {
    x: MARGIN + 10,
    y: A4_HEIGHT - MARGIN - 18,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.25, 0.45),
  });
  page.drawText("CAISSE NATIONALE D'ASSURANCE MALADIE (CNAM)", {
    x: MARGIN + 10,
    y: A4_HEIGHT - MARGIN - 32,
    size: 9,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  page.drawText("BULLETIN DE SOINS (BS1)", {
    x: MARGIN + 10,
    y: A4_HEIGHT - MARGIN - 50,
    size: 14,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  // BS reference (top-right)
  const ref = shortBsNumber(data.appointment.id);
  page.drawText(`Réf. ${ref}`, {
    x: A4_WIDTH - MARGIN - 110,
    y: A4_HEIGHT - MARGIN - 20,
    size: 10,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });
  page.drawText(`Émis le ${formatDate(new Date())}`, {
    x: A4_WIDTH - MARGIN - 110,
    y: A4_HEIGHT - MARGIN - 34,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  let y = A4_HEIGHT - MARGIN - 80;

  // ── Section A — Assuré social ──────────────────────────────────────────────
  drawSectionHeader(page, fontBold, y, "A", "ASSURÉ SOCIAL");
  y -= 26;

  drawLabel(page, font, MARGIN, y, "N° identifiant CNAM");
  drawDottedField(page, MARGIN + 110, y, 200, font, data.patient.cnamNumber);
  drawLabel(page, font, MARGIN + 320, y, "N° CNSS / CNRPS");
  drawDottedField(page, MARGIN + 410, y, 110, font, data.patient.cnssNumber);
  y -= 24;

  drawLabel(page, font, MARGIN, y, "Nom et prénom");
  drawDottedField(page, MARGIN + 110, y, 410, font, data.patient.name);
  y -= 24;

  drawLabel(page, font, MARGIN, y, "Date de naissance");
  drawDottedField(page, MARGIN + 110, y, 130, font, formatDate(data.patient.dateOfBirth));
  drawLabel(page, font, MARGIN + 250, y, "CIN");
  drawDottedField(page, MARGIN + 280, y, 230, font, data.patient.cin);
  y -= 28;

  // ── Section B — Régime ─────────────────────────────────────────────────────
  drawSectionHeader(page, fontBold, y, "B", "RÉGIME D'AFFILIATION");
  y -= 22;

  const regime = data.patient.cnamRegime ?? "none";
  drawCheckbox(page, font, MARGIN, y, "CNSS (salariés privé)", regime === "cnss");
  drawCheckbox(page, font, MARGIN + 170, y, "CNRPS (fonction publique)", regime === "cnrps");
  drawCheckbox(page, font, MARGIN + 360, y, "Convention étudiant", regime === "convention_etudiant");
  y -= 18;
  drawCheckbox(page, font, MARGIN, y, "Convention Al Aaliyah", regime === "convention_alaaliyah");
  drawCheckbox(page, font, MARGIN + 170, y, "Autre / non précisé", regime === "none" || !REGIME_LABELS[regime]);
  y -= 26;

  // ── Section C — Prestataire (médecin) ──────────────────────────────────────
  drawSectionHeader(page, fontBold, y, "C", "PRESTATAIRE DE SOINS");
  y -= 26;

  drawLabel(page, font, MARGIN, y, "Nom du médecin");
  drawDottedField(page, MARGIN + 110, y, 410, font, data.doctor.name);
  y -= 22;

  drawLabel(page, font, MARGIN, y, "Spécialité");
  drawDottedField(page, MARGIN + 110, y, 200, font, data.doctor.specialty);
  drawLabel(page, font, MARGIN + 320, y, "Code CNOM");
  drawDottedField(page, MARGIN + 380, y, 140, font, data.doctor.cnomCode);
  y -= 22;

  drawLabel(page, font, MARGIN, y, "Adresse");
  drawDottedField(page, MARGIN + 110, y, 410, font, data.doctor.address);
  y -= 22;

  drawLabel(page, font, MARGIN, y, "N° conventionnement");
  drawDottedField(page, MARGIN + 110, y, 200, font, data.doctor.cnamConventionCode);
  if (data.practice?.phone) {
    drawLabel(page, font, MARGIN + 320, y, "Téléphone");
    drawDottedField(page, MARGIN + 380, y, 140, font, data.practice.phone);
  }
  y -= 28;

  // ── Section D — Soins dispensés ────────────────────────────────────────────
  drawSectionHeader(page, fontBold, y, "D", "SOINS DISPENSÉS");
  y -= 26;

  drawLabel(page, font, MARGIN, y, "Date de la consultation");
  drawDottedField(page, MARGIN + 130, y, 200, font, formatDate(data.appointment.date));
  y -= 22;

  drawLabel(page, font, MARGIN, y, "Diagnostic / motif");
  drawDottedField(page, MARGIN + 110, y, 410, font, data.appointment.diagnosis);
  y -= 22;

  drawLabel(page, font, MARGIN, y, "Nature de l'acte");
  drawDottedField(page, MARGIN + 110, y, 410, font, data.appointment.treatments ?? "Consultation");
  y -= 22;

  drawLabel(page, font, MARGIN, y, "Montant des honoraires (TND)");
  drawDottedField(page, MARGIN + 160, y, 150, font, formatMillimes(data.appointment.consultationFee));
  y -= 36;

  // ── Section E — Signatures ─────────────────────────────────────────────────
  drawSectionHeader(page, fontBold, y, "E", "SIGNATURES");
  y -= 22;

  // Two boxes side by side
  const boxW = (A4_WIDTH - MARGIN * 2 - 20) / 2;
  const boxH = 90;
  const boxY = y - boxH;

  page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.6,
  });
  drawLabel(page, font, MARGIN + 6, boxY + boxH - 12, "Signature du médecin (+ cachet)");

  page.drawRectangle({
    x: MARGIN + boxW + 20,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.6,
  });
  drawLabel(page, font, MARGIN + boxW + 26, boxY + boxH - 12, "Signature de l'assuré");

  // ── Footer disclaimer ──────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y: 50 },
    end: { x: A4_WIDTH - MARGIN, y: 50 },
    thickness: 0.4,
    color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(
    "Document genere par Doktori - verifier avant signature et envoi a la CNAM.",
    {
      x: MARGIN,
      y: 36,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    },
  );
  page.drawText(
    `Reference: ${ref} - genere le ${formatDate(new Date())} - non transmis automatiquement (V1, en attendant l'API SEED CNAM).`,
    {
      x: MARGIN,
      y: 24,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  return pdfDoc.save();
}
