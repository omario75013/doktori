/*
 * Mock data for the in-house clinic-lab "Rad1" used by labo.test@clinique-elmanar.tn.
 * Idempotent: re-running deletes [MOCK]-tagged rows first.
 *
 * Usage:  node scripts/seed-lab-mock.cjs
 */
const postgres = require("postgres");

const LAB_ID = "24a561ee-fc83-49fd-b63e-fe24167cc4a0"; // Rad1 (radiology, in-house at El Manar)
const CLINIC_ID = "c1000000-0000-0000-0000-000000000001";

const DOCTORS = [
  { id: "d1000000-0000-0000-0000-000000000001", name: "Dr. Sami Bouaziz" },
  { id: "d1000000-0000-0000-0000-000000000002", name: "Dr. Leila Khelifi" },
  { id: "d1000000-0000-0000-0000-000000000003", name: "Dr. Nour Hammami" },
];
const PATIENTS = [
  "885738e6-5442-465d-b60e-8bb367059028",
  "b1000000-0000-0000-0000-000000000001",
  "b1000000-0000-0000-0000-000000000002",
  "b1000000-0000-0000-0000-000000000003",
  "b1000000-0000-0000-0000-000000000004",
  "b1000000-0000-0000-0000-000000000005",
];

const MOCK = "[MOCK]";
function pick(arr, i) { return arr[((i % arr.length) + arr.length) % arr.length]; }
function dayOffset(days, h = 10, m = 0) {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d;
}

const RADIO_CATALOG = [
  { code: "ECHO-ABD", name: "Échographie abdominale", category: "imagerie", price: 80000, duration: 1 },
  { code: "ECHO-CARDIO", name: "Échographie cardiaque", category: "imagerie", price: 120000, duration: 1 },
  { code: "ECHO-THYROID", name: "Échographie thyroïdienne", category: "imagerie", price: 60000, duration: 1 },
  { code: "RX-THORAX", name: "Radio thoracique", category: "imagerie", price: 45000, duration: 1 },
  { code: "RX-MEMBRE", name: "Radio membre", category: "imagerie", price: 40000, duration: 1 },
  { code: "IRM-CEREBRAL", name: "IRM cérébrale", category: "imagerie", price: 320000, duration: 48 },
  { code: "IRM-RACHIS", name: "IRM rachis lombaire", category: "imagerie", price: 320000, duration: 48 },
  { code: "SCAN-ABD", name: "Scanner abdominal", category: "imagerie", price: 220000, duration: 24 },
  { code: "SCAN-THORAX", name: "Scanner thoracique", category: "imagerie", price: 220000, duration: 24 },
  { code: "MAMMO", name: "Mammographie bilatérale", category: "imagerie", price: 95000, duration: 1 },
];

(async () => {
  const sql = postgres("postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori");
  const log = (...a) => console.log("·", ...a);
  try {
    // ── 0. Verify lab user exists ─────────────────────────────────────────
    const [u] = await sql`SELECT id, lab_id FROM lab_users WHERE email='labo.test@clinique-elmanar.tn'`;
    if (!u) throw new Error("lab user labo.test@clinique-elmanar.tn not found");
    log("Lab user:", u.id, "lab:", u.lab_id);

    // ── 1. Clean prior MOCK rows ──────────────────────────────────────────
    log("Cleaning prior MOCK rows…");
    await sql`DELETE FROM lab_messages WHERE conversation_id IN (SELECT id FROM lab_conversations WHERE lab_id=${LAB_ID} AND subject LIKE ${MOCK + "%"})`;
    await sql`DELETE FROM lab_conversations WHERE lab_id=${LAB_ID} AND subject LIKE ${MOCK + "%"}`;
    await sql`DELETE FROM patient_documents WHERE uploaded_by_lab_id=${LAB_ID} AND title LIKE ${MOCK + "%"}`;
    await sql`DELETE FROM lab_orders WHERE (lab_id=${LAB_ID} OR completed_by_lab_id=${LAB_ID}) AND instructions LIKE ${MOCK + "%"}`;
    await sql`DELETE FROM lab_analysis_types WHERE lab_id=${LAB_ID}`;
    await sql`DELETE FROM lab_closed_days WHERE lab_id=${LAB_ID} AND reason LIKE ${MOCK + "%"}`;
    await sql`DELETE FROM lab_schedules WHERE lab_id=${LAB_ID}`;

    // ── 2. Analyses catalog ───────────────────────────────────────────────
    log("Analyses catalog…");
    for (const t of RADIO_CATALOG) {
      await sql`INSERT INTO lab_analysis_types (lab_id, code, name, category, price_millimes, duration_hours, is_active)
        VALUES (${LAB_ID}, ${t.code}, ${t.name}, ${t.category}, ${t.price}, ${t.duration}, true)`;
    }

    // ── 3. Weekly schedule (Mon-Sat open, Sun closed) ─────────────────────
    log("Weekly schedule…");
    const weekly = [
      { dow: 0, closed: true, opens: null, closes: null },        // Sunday
      { dow: 1, closed: false, opens: "08:00", closes: "18:00" }, // Monday
      { dow: 2, closed: false, opens: "08:00", closes: "18:00" },
      { dow: 3, closed: false, opens: "08:00", closes: "18:00" },
      { dow: 4, closed: false, opens: "08:00", closes: "18:00" },
      { dow: 5, closed: false, opens: "08:00", closes: "18:00" },
      { dow: 6, closed: false, opens: "08:00", closes: "13:00" }, // Saturday half-day
    ];
    for (const w of weekly) {
      await sql`INSERT INTO lab_schedules (lab_id, day_of_week, opens_at, closes_at, is_closed)
        VALUES (${LAB_ID}, ${w.dow}, ${w.opens}, ${w.closes}, ${w.closed})`;
    }
    // Closed day exception next week
    const closedDate = new Date(); closedDate.setDate(closedDate.getDate() + 5);
    await sql`INSERT INTO lab_closed_days (lab_id, date, reason) VALUES
      (${LAB_ID}, ${closedDate.toISOString().slice(0, 10)}, ${MOCK + " Maintenance équipement IRM"})`;

    // ── 4. Lab orders — mixed statuses spanning past / today / future ─────
    log("Lab orders…");
    const ordersSpec = [
      // past completed orders (5)
      { d: 0, p: 0, daysAgo: 10, status: "completed", tests: [RADIO_CATALOG[0]], hasResult: true, urgency: "routine" },
      { d: 1, p: 1, daysAgo: 8, status: "completed", tests: [RADIO_CATALOG[3]], hasResult: true, urgency: "routine" },
      { d: 0, p: 2, daysAgo: 6, status: "completed", tests: [RADIO_CATALOG[5]], hasResult: true, urgency: "urgent" },
      { d: 2, p: 3, daysAgo: 4, status: "completed", tests: [RADIO_CATALOG[7]], hasResult: true, urgency: "routine" },
      { d: 1, p: 4, daysAgo: 2, status: "completed", tests: [RADIO_CATALOG[9]], hasResult: true, urgency: "routine" },
      // result_ready (3)
      { d: 0, p: 5, daysAgo: 1, status: "result_ready", tests: [RADIO_CATALOG[1]], hasResult: true, urgency: "routine" },
      { d: 1, p: 0, daysAgo: 1, status: "result_ready", tests: [RADIO_CATALOG[4]], hasResult: true, urgency: "urgent" },
      { d: 2, p: 1, daysAgo: 0, status: "result_ready", tests: [RADIO_CATALOG[8]], hasResult: true, urgency: "routine" },
      // in_progress today (3)
      { d: 0, p: 2, daysAgo: 0, status: "in_progress", tests: [RADIO_CATALOG[0]], hasResult: false, urgency: "routine" },
      { d: 1, p: 3, daysAgo: 0, status: "in_progress", tests: [RADIO_CATALOG[6]], hasResult: false, urgency: "urgent" },
      { d: 2, p: 4, daysAgo: 0, status: "in_progress", tests: [RADIO_CATALOG[2]], hasResult: false, urgency: "routine" },
      // pending today (4)
      { d: 0, p: 5, daysAgo: 0, status: "pending", tests: [RADIO_CATALOG[3]], hasResult: false, urgency: "routine" },
      { d: 1, p: 0, daysAgo: 0, status: "pending", tests: [RADIO_CATALOG[5]], hasResult: false, urgency: "urgent" },
      { d: 2, p: 1, daysAgo: 0, status: "pending", tests: [RADIO_CATALOG[7]], hasResult: false, urgency: "routine" },
      { d: 0, p: 2, daysAgo: 0, status: "pending", tests: [RADIO_CATALOG[9]], hasResult: false, urgency: "routine" },
      // future expected (2 — pending for tomorrow / next week)
      { d: 1, p: 3, daysAgo: -1, status: "pending", tests: [RADIO_CATALOG[0]], hasResult: false, urgency: "routine" },
      { d: 2, p: 4, daysAgo: -3, status: "pending", tests: [RADIO_CATALOG[1]], hasResult: false, urgency: "routine" },
    ];

    let refSeq = 2026000;
    for (let i = 0; i < ordersSpec.length; i++) {
      const o = ordersSpec[i];
      const doctor = DOCTORS[o.d];
      const patientId = PATIENTS[o.p];
      const tests = o.tests.map((t) => ({ name: t.name, code: t.code }));
      const createdAt = dayOffset(-Math.max(o.daysAgo, 0) - (o.daysAgo < 0 ? 0 : 1), 9, 0);
      const specimenAt = o.status !== "pending" ? dayOffset(-o.daysAgo, 10, 0) : null;
      const expectedAt = dayOffset(-o.daysAgo + 1, 12, 0);
      const uploadedAt = o.hasResult ? dayOffset(-o.daysAgo + 1, 14, 30) : null;
      const internalRef = `RAD-${refSeq++}`;
      const summary = o.hasResult ? pick(["Normal", "RAS", "Lésion à surveiller", "Anormal — voir compte-rendu"], i) : null;

      const [order] = await sql`
        INSERT INTO lab_orders (
          doctor_id, patient_id, lab_id, tests, instructions, urgency, status,
          access_token, internal_ref, specimen_collected_at, expected_result_at,
          result_uploaded_at, technician_id, result_summary, completed_by_lab_id, completed_at, created_at
        ) VALUES (
          ${doctor.id}, ${patientId}, ${LAB_ID},
          ${tests}, ${MOCK + " À jeun. Prélèvement matinal."},
          ${o.urgency}, ${o.status},
          ${"TOK-" + Math.random().toString(36).slice(2, 12)},
          ${internalRef}, ${specimenAt}, ${expectedAt},
          ${uploadedAt}, ${o.hasResult ? u.id : null}, ${summary},
          ${o.hasResult ? LAB_ID : null}, ${uploadedAt}, ${createdAt}
        ) RETURNING id`;

      // For orders with a result, create a patient_documents row shared with the prescribing doctor
      if (o.hasResult) {
        await sql`
          INSERT INTO patient_documents (
            patient_id, uploaded_by, uploaded_by_lab_id, shared_with_doctor_ids,
            file_url, file_name, mime_type, size_bytes, category, title, note,
            lab_order_id, created_at
          ) VALUES (
            ${patientId}, 'lab', ${LAB_ID}, ARRAY[${doctor.id}]::uuid[],
            ${"https://mock.doktori.tn/rad-result-" + i + ".pdf"},
            ${"resultat-radio-" + internalRef + ".pdf"},
            'application/pdf', 245600, 'imagerie',
            ${MOCK + " " + o.tests[0].name},
            ${"Compte-rendu " + tests[0].name + ". " + summary},
            ${order.id}, ${uploadedAt}
          )`;
      }
    }

    // ── 5. Lab ↔ Doctor conversations ─────────────────────────────────────
    log("Conversations + messages…");
    const convSpecs = [
      { docIdx: 0, subj: MOCK + " Suivi IRM patient Ben Salah", lastFromLab: true },
      { docIdx: 1, subj: MOCK + " Question concernant mammographie", lastFromLab: false },
      { docIdx: 2, subj: MOCK + " Disponibilité urgence pédiatrique", lastFromLab: true },
    ];
    for (const c of convSpecs) {
      const doc = DOCTORS[c.docIdx];
      const [conv] = await sql`
        INSERT INTO lab_conversations (
          lab_id, counterpart_doctor_id, subject,
          last_message_at, last_message_preview, unread_count_lab, unread_count_counterpart
        ) VALUES (
          ${LAB_ID}, ${doc.id}, ${c.subj},
          NOW(), ${"Aperçu du dernier message…"}, ${c.lastFromLab ? 0 : 1}, ${c.lastFromLab ? 1 : 0}
        ) RETURNING id`;

      // 3-4 messages alternating
      const turns = [
        { from: "doctor", senderId: doc.id, body: "Bonjour, le patient peut-il passer ce matin ?" },
        { from: "lab", senderId: LAB_ID, body: "Bonjour, oui créneau disponible à 10h30." },
        { from: "doctor", senderId: doc.id, body: "Parfait, je le préviens. Merci !" },
        { from: c.lastFromLab ? "lab" : "doctor", senderId: c.lastFromLab ? LAB_ID : doc.id, body: c.lastFromLab ? "Résultat disponible cet après-midi." : "Pouvez-vous m'envoyer le compte-rendu signé ?" },
      ];
      for (let k = 0; k < turns.length; k++) {
        const t = turns[k];
        await sql`INSERT INTO lab_messages (conversation_id, sender_type, sender_id, body, created_at)
          VALUES (${conv.id}, ${t.from}, ${t.senderId}, ${t.body}, ${dayOffset(0, 10 + k, k * 15)})`;
      }
    }

    // ── 6. Inter-lab conversation (with another lab) ──────────────────────
    log("Inter-lab conversation…");
    const [otherLab] = await sql`SELECT id, name FROM labs WHERE id <> ${LAB_ID} AND verification_status='verified' LIMIT 1`;
    if (otherLab) {
      const [conv] = await sql`
        INSERT INTO lab_conversations (
          lab_id, counterpart_lab_id, subject,
          last_message_at, last_message_preview, unread_count_lab, unread_count_counterpart
        ) VALUES (
          ${LAB_ID}, ${otherLab.id}, ${MOCK + " Référence patient pour examen spécialisé"},
          NOW(), 'Merci pour la collaboration', 0, 0
        ) RETURNING id`;
      await sql`INSERT INTO lab_messages (conversation_id, sender_type, sender_id, body, created_at) VALUES
        (${conv.id}, 'lab', ${LAB_ID}, ${"Bonjour, pouvons-nous référer un patient pour un IRM cardiaque ?"}, NOW() - INTERVAL '2 hours'),
        (${conv.id}, 'lab', ${otherLab.id}, ${"Oui, envoyez-nous le compte-rendu et la prescription."}, NOW() - INTERVAL '1 hours'),
        (${conv.id}, 'lab', ${LAB_ID}, 'Merci pour la collaboration', NOW())`;
    }

    // ── Summary ───────────────────────────────────────────────────────────
    const counts = await sql`SELECT
      (SELECT count(*) FROM lab_analysis_types WHERE lab_id=${LAB_ID}) as analyses,
      (SELECT count(*) FROM lab_orders WHERE lab_id=${LAB_ID} OR completed_by_lab_id=${LAB_ID}) as orders,
      (SELECT count(*) FROM patient_documents WHERE uploaded_by_lab_id=${LAB_ID}) as docs,
      (SELECT count(*) FROM lab_schedules WHERE lab_id=${LAB_ID}) as schedule,
      (SELECT count(*) FROM lab_closed_days WHERE lab_id=${LAB_ID}) as closed_days,
      (SELECT count(*) FROM lab_conversations WHERE lab_id=${LAB_ID}) as conversations,
      (SELECT count(*) FROM lab_messages WHERE conversation_id IN (SELECT id FROM lab_conversations WHERE lab_id=${LAB_ID})) as messages`;
    console.log("\n✓ Lab seed complete:");
    console.log(counts[0]);
  } catch (e) {
    console.error("FAIL:", e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
