/*
 * Idempotent mock data seed for Clinique El Manar — fills every clinic section
 * with realistic content so the dashboard, dossier, finance, qualité, CNAM,
 * audit, waiting room, lab inbox and communications pages all light up.
 *
 * Re-running this script is safe: it deletes prior [MOCK]-tagged rows first.
 *
 * Usage:  DATABASE_URL=... node scripts/seed-clinic-mock.cjs
 */
const postgres = require("postgres");

const CLINIC_ID = "c1000000-0000-0000-0000-000000000001";
const DOCTORS = [
  { id: "d1000000-0000-0000-0000-000000000001", name: "Dr. Sami Bouaziz", practiceId: "7e6d1cca-efc6-4751-9c07-009607e1d6e2", fee: 50000 },
  { id: "d1000000-0000-0000-0000-000000000002", name: "Dr. Leila Khelifi", practiceId: "a1184181-a97c-4e9d-a463-8cbfb30b095b", fee: 80000 },
  { id: "d1000000-0000-0000-0000-000000000003", name: "Dr. Nour Hammami", practiceId: "4a942c77-caf0-4bd2-85c4-c1e2b42fc863", fee: 60000 },
];
const PATIENTS = [
  "885738e6-5442-465d-b60e-8bb367059028",
  "b1000000-0000-0000-0000-000000000001",
  "b1000000-0000-0000-0000-000000000002",
  "b1000000-0000-0000-0000-000000000003",
  "b1000000-0000-0000-0000-000000000004",
  "b1000000-0000-0000-0000-000000000005",
];
const MOTIFS = ["Consultation générale", "Contrôle HTA", "Suivi diabète", "Dermatologie", "Pédiatrie - vaccin", "Renouvellement ordonnance", "Bilan annuel"];

function pick(arr, i) { return arr[((i % arr.length) + arr.length) % arr.length]; }
function uuid(seed) {
  // Deterministic v4-shaped UUID from a string — for idempotent inserts.
  const hash = require("crypto").createHash("sha1").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function todayAt(h, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function dayOffset(days, h = 10, m = 0) {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d;
}

const MOCK_TAG = "[MOCK]";

(async () => {
  const sql = postgres(process.env.DATABASE_URL || "postgresql://doktori:doktori_dev@127.0.0.1:5432/doktori");
  const log = (...a) => console.log("·", ...a);

  try {
    // ── 0. Wipe prior MOCK rows so seeding is idempotent ───────────────────
    log("Cleaning prior MOCK rows…");
    await sql`DELETE FROM appointments WHERE reason LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM cnam_claims WHERE notes LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM clinic_invitations WHERE email LIKE 'mock-%'`;
    await sql`DELETE FROM clinic_notes WHERE clinic_id=${CLINIC_ID} AND body LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM reviews WHERE comment LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM bulk_sms_campaigns WHERE clinic_id=${CLINIC_ID} AND message LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM clinic_audit_log WHERE clinic_id=${CLINIC_ID} AND metadata->>'mock'='1'`;
    await sql`DELETE FROM medical_certificates WHERE title LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM prescriptions WHERE content LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM patient_documents WHERE title LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM patient_analyses WHERE title LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM patient_vaccinations WHERE notes LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM patient_allergies WHERE reaction LIKE ${MOCK_TAG + "%"}`;
    await sql`DELETE FROM lab_orders WHERE instructions LIKE ${MOCK_TAG + "%"}`;

    // ── 1. Patient medical profile ─────────────────────────────────────────
    log("Medical profiles…");
    const profiles = [
      { lifestyle: { smoking: "non", alcohol: "occasionnel", sport: "régulier" }, chronic: "HTA, dyslipidémie" },
      { lifestyle: { smoking: "occasionnel", alcohol: "non", sport: "modéré" }, chronic: null },
      { lifestyle: { smoking: "non", alcohol: "non", sport: "sédentaire" }, chronic: "Diabète type 2" },
      { lifestyle: { smoking: "ex-fumeur", alcohol: "non", sport: "régulier" }, chronic: "Asthme" },
      { lifestyle: { smoking: "non", alcohol: "non", sport: "régulier" }, chronic: null },
      { lifestyle: { smoking: "non", alcohol: "non", sport: "modéré" }, chronic: null },
    ];
    for (let i = 0; i < PATIENTS.length; i++) {
      const p = profiles[i];
      await sql`INSERT INTO patient_medical_profile (patient_id, chronic_conditions, lifestyle, updated_at)
        VALUES (${PATIENTS[i]}, ${p.chronic}, ${p.lifestyle}, NOW())
        ON CONFLICT (patient_id) DO UPDATE SET chronic_conditions=EXCLUDED.chronic_conditions, lifestyle=EXCLUDED.lifestyle, updated_at=NOW()`;
    }

    // ── 2. Allergies ───────────────────────────────────────────────────────
    log("Allergies…");
    const allergens = [
      { allergen: "Pénicilline", severity: "severe", reaction: `${MOCK_TAG} Œdème + difficulté respiratoire` },
      { allergen: "Arachides", severity: "moderate", reaction: `${MOCK_TAG} Urticaire généralisée` },
      { allergen: "Pollen", severity: "mild", reaction: `${MOCK_TAG} Rhinite saisonnière` },
      { allergen: "Aspirine", severity: "moderate", reaction: `${MOCK_TAG} Bronchospasme` },
      { allergen: "Latex", severity: "mild", reaction: `${MOCK_TAG} Dermatite de contact` },
    ];
    for (let i = 0; i < PATIENTS.length; i++) {
      const a1 = allergens[i % allergens.length];
      const a2 = allergens[(i + 2) % allergens.length];
      await sql`INSERT INTO patient_allergies (patient_id, allergen, severity, reaction, diagnosed_at) VALUES
        (${PATIENTS[i]}, ${a1.allergen}, ${a1.severity}, ${a1.reaction}, '2022-03-15'),
        (${PATIENTS[i]}, ${a2.allergen}, ${a2.severity}, ${a2.reaction}, '2024-09-10')`;
    }

    // ── 3. Vaccinations ────────────────────────────────────────────────────
    log("Vaccinations…");
    const vaccines = [
      { name: "Tétanos (rappel)", date: "2024-11-12" },
      { name: "COVID-19 (Pfizer)", date: "2024-03-08" },
      { name: "Grippe saisonnière", date: "2025-10-22" },
      { name: "Hépatite B", date: "2023-05-18" },
      { name: "ROR", date: "2018-04-02" },
    ];
    for (let i = 0; i < PATIENTS.length; i++) {
      for (let k = 0; k < 3; k++) {
        const v = vaccines[(i + k) % vaccines.length];
        await sql`INSERT INTO patient_vaccinations (patient_id, vaccine_name, date_received, batch_number, given_by, notes) VALUES
          (${PATIENTS[i]}, ${v.name}, ${v.date}, ${"BATCH-" + (1000 + i * 7 + k)}, ${pick(DOCTORS, i + k).name}, ${MOCK_TAG + " administration en cabinet"})`;
      }
    }

    // ── 4. Analyses ────────────────────────────────────────────────────────
    log("Analyses…");
    const tests = ["NFS + plaquettes", "Glycémie à jeun", "HbA1c", "Bilan lipidique", "TSH", "Créatininémie", "Vitamine D"];
    for (let i = 0; i < PATIENTS.length; i++) {
      for (let k = 0; k < 2; k++) {
        const title = pick(tests, i + k);
        await sql`INSERT INTO patient_analyses (patient_id, title, lab_name, test_date, notes) VALUES
          (${PATIENTS[i]}, ${MOCK_TAG + " " + title}, ${"Laboratoire Carthage"}, ${dayOffset(-30 * (k + 1), 9).toISOString().slice(0, 10)}, ${"Résultats dans la norme"})`;
      }
    }

    // ── 5. Prescriptions ───────────────────────────────────────────────────
    log("Prescriptions…");
    const rxBodies = [
      "Amoxicilline 1g — 1 cp x 3/jour pendant 7 jours\nParacétamol 1g — si fièvre > 38.5°C",
      "Metformine 850 mg — 1 cp x 2/jour\nAtorvastatine 20 mg — 1 cp le soir",
      "Ventoline — 2 bouffées en cas de crise\nFlixotide 250 — 1 bouffée matin et soir",
      "Lisinopril 10 mg — 1 cp/jour\nAspirine 100 mg — 1 cp/jour",
      "Doliprane 1g — 1 cp x 3/jour si douleur",
    ];
    for (let i = 0; i < PATIENTS.length; i++) {
      for (let k = 0; k < 2; k++) {
        const d = pick(DOCTORS, i + k);
        await sql`INSERT INTO prescriptions (doctor_id, patient_id, content) VALUES
          (${d.id}, ${PATIENTS[i]}, ${MOCK_TAG + " " + pick(rxBodies, i + k)})`;
      }
    }

    // ── 6. Medical certificates ────────────────────────────────────────────
    log("Certificats…");
    for (let i = 0; i < PATIENTS.length; i++) {
      const d = pick(DOCTORS, i);
      await sql`INSERT INTO medical_certificates (doctor_id, patient_id, title, content, verification_token) VALUES
        (${d.id}, ${PATIENTS[i]}, ${MOCK_TAG + " Certificat d'arrêt de travail"}, ${"Je soussigné Dr. " + d.name + " certifie avoir examiné le patient et prescris un arrêt de travail de 3 jours."}, ${"TOK-" + uuid("cert-" + i).slice(0, 12)})`;
    }

    // ── 7. Patient documents (one from lab) ────────────────────────────────
    log("Documents…");
    for (let i = 0; i < PATIENTS.length; i++) {
      const dr = pick(DOCTORS, i);
      await sql`INSERT INTO patient_documents (patient_id, uploaded_by, uploaded_by_doctor_id, shared_with_doctor_ids, file_url, file_name, mime_type, size_bytes, category, title, note) VALUES
        (${PATIENTS[i]}, 'doctor', ${dr.id}, ARRAY[${dr.id}]::uuid[], ${"https://mock.doktori.tn/doc-" + i + ".pdf"}, ${"ordonnance-" + i + ".pdf"}, 'application/pdf', 124500, 'ordonnance', ${MOCK_TAG + " Ordonnance numérisée"}, 'Document de référence')`;
      await sql`INSERT INTO patient_documents (patient_id, uploaded_by, shared_with_doctor_ids, file_url, file_name, mime_type, size_bytes, category, title, note) VALUES
        (${PATIENTS[i]}, 'lab', ARRAY[${dr.id}]::uuid[], ${"https://mock.doktori.tn/lab-result-" + i + ".pdf"}, ${"resultat-bilan-" + i + ".pdf"}, 'application/pdf', 286400, 'analyse', ${MOCK_TAG + " Résultat bilan sanguin"}, 'Résultats laboratoire')`;
    }

    // ── 8. Lab orders (mixed statuses) ─────────────────────────────────────
    log("Lab orders…");
    const labOrderStatuses = ["pending", "in_progress", "result_ready", "pending", "result_ready", "pending"];
    for (let i = 0; i < PATIENTS.length; i++) {
      const d = pick(DOCTORS, i);
      const status = labOrderStatuses[i];
      await sql`INSERT INTO lab_orders (doctor_id, patient_id, tests, instructions, urgency, status, access_token) VALUES
        (${d.id}, ${PATIENTS[i]}, ${[{ name: pick(tests, i), code: "TST" + (i + 1) }, { name: pick(tests, i + 1), code: "TST" + (i + 2) }]}, ${MOCK_TAG + " À jeun, prélèvement matinal"}, ${pick(["routine", "urgent", "routine"], i)}, ${status}, ${"LAB-" + uuid("lab-" + i).slice(0, 16)})`;
    }

    // ── 9. Today's appointments — pipeline & dashboard KPIs ────────────────
    log("Today's appointments (pipeline)…");
    // Use UPSERT pattern by ID built from seed
    const today = new Date();
    const todayApps = [
      { d: 0, p: 0, h: 8, status: "completed", checkedIn: true, paid: true },   // termines + revenue
      { d: 0, p: 1, h: 9, status: "completed", checkedIn: true, paid: true },
      { d: 1, p: 2, h: 10, status: "confirmed", checkedIn: true, paid: false }, // arrives bucket
      { d: 1, p: 3, h: 11, status: "confirmed", checkedIn: false, paid: false },// attendus
      { d: 2, p: 4, h: 14, status: "confirmed", checkedIn: false, paid: false },
      { d: 0, p: 5, h: 15, status: "confirmed", checkedIn: false, paid: false },
      { d: 2, p: 0, h: 16, status: "no_show", checkedIn: false, paid: false },  // no-show
      { d: 1, p: 1, h: 17, status: "completed", checkedIn: true, paid: true },
    ];
    for (let i = 0; i < todayApps.length; i++) {
      const a = todayApps[i];
      const d = DOCTORS[a.d];
      const starts = todayAt(a.h, 0);
      const ends = todayAt(a.h, 30);
      const checkedAt = a.checkedIn ? new Date(starts.getTime() - 20 * 60000) : null;
      await sql`INSERT INTO appointments (doctor_id, patient_id, practice_id, starts_at, ends_at, status, type, reason, payment_status, payment_amount, paid_at, checked_in_at)
        VALUES (${d.id}, ${PATIENTS[a.p]}, ${d.practiceId}, ${starts}, ${ends}, ${a.status}, 'cabinet', ${MOCK_TAG + " " + pick(MOTIFS, i)}, ${a.paid ? "paid" : "pending"}, ${a.paid ? d.fee : null}, ${a.paid ? starts : null}, ${checkedAt})`;
    }

    // Tomorrow + next 6 days for forecast
    log("Future appointments (forecast)…");
    for (let dayN = 1; dayN <= 7; dayN++) {
      for (let k = 0; k < 4; k++) {
        const d = pick(DOCTORS, dayN + k);
        const starts = dayOffset(dayN, 9 + k * 2, 0);
        const ends = dayOffset(dayN, 9 + k * 2, 30);
        await sql`INSERT INTO appointments (doctor_id, patient_id, practice_id, starts_at, ends_at, status, type, reason, payment_status)
          VALUES (${d.id}, ${pick(PATIENTS, dayN + k)}, ${d.practiceId}, ${starts}, ${ends}, 'confirmed', 'cabinet', ${MOCK_TAG + " " + pick(MOTIFS, dayN + k)}, 'pending')`;
      }
    }

    // Past 30 days for sparklines + finance
    log("Past 30 days history…");
    for (let dayN = -30; dayN <= -1; dayN++) {
      const n = 2 + (Math.abs(dayN) % 4); // 2-5 per day
      for (let k = 0; k < n; k++) {
        const d = pick(DOCTORS, dayN + k);
        const starts = dayOffset(dayN, 8 + k * 2, 30);
        const ends = dayOffset(dayN, 8 + k * 2, 60);
        const status = (Math.abs(dayN) + k) % 9 === 0 ? "no_show" : (Math.abs(dayN) + k) % 11 === 0 ? "cancelled" : "completed";
        const paid = status === "completed";
        await sql`INSERT INTO appointments (doctor_id, patient_id, practice_id, starts_at, ends_at, status, type, reason, payment_status, payment_amount, paid_at)
          VALUES (${d.id}, ${pick(PATIENTS, dayN + k)}, ${d.practiceId}, ${starts}, ${ends}, ${status}, 'cabinet', ${MOCK_TAG + " " + pick(MOTIFS, dayN + k)}, ${paid ? "paid" : "pending"}, ${paid ? d.fee : null}, ${paid ? starts : null})`;
      }
    }

    // ── 10. CNAM claims (mixed statuses) ───────────────────────────────────
    log("CNAM claims…");
    const apptForClaims = await sql`SELECT id, doctor_id, patient_id FROM appointments WHERE status='completed' AND reason LIKE ${MOCK_TAG + "%"} LIMIT 8`;
    const cnamStatuses = ["pending", "pending", "submitted", "rejected", "rejected", "approved", "pending", "submitted"];
    for (let i = 0; i < apptForClaims.length; i++) {
      const a = apptForClaims[i];
      await sql`INSERT INTO cnam_claims (appointment_id, doctor_id, patient_id, cnam_number, patient_role, amount, consultation_date, status, submitted_at, notes)
        VALUES (${a.id}, ${a.doctor_id}, ${a.patient_id}, ${"CNAM-" + (1000000 + i)}, 'principal', ${(35 + i * 5) * 1000}, ${dayOffset(-i, 9).toISOString().slice(0, 10)}, ${cnamStatuses[i]}, ${cnamStatuses[i] !== "pending" ? dayOffset(-i + 1, 10) : null}, ${MOCK_TAG + " demande automatique"})`;
    }

    // ── 11. Clinic invitations (pending) ───────────────────────────────────
    log("Clinic invitations…");
    await sql`INSERT INTO clinic_invitations (clinic_id, email, role, status, token, expires_at) VALUES
      (${CLINIC_ID}, 'mock-cardio@example.tn', 'doctor', 'pending', ${uuid("inv-1")}, ${dayOffset(7, 12)}),
      (${CLINIC_ID}, 'mock-radio@example.tn', 'doctor', 'pending', ${uuid("inv-2")}, ${dayOffset(7, 12)})`;

    // ── 12. Clinic notes ───────────────────────────────────────────────────
    log("Clinic notes…");
    await sql`INSERT INTO clinic_notes (clinic_id, author_type, body, pinned, title) VALUES
      (${CLINIC_ID}, 'clinic', ${MOCK_TAG + " Réunion d'équipe vendredi 17h — points: planning ramadan + nouveau protocole CNAM"}, true, 'Réunion équipe'),
      (${CLINIC_ID}, 'clinic', ${MOCK_TAG + " Commander stock seringues 5ml — rupture probable d'ici 10 jours"}, false, 'Stock'),
      (${CLINIC_ID}, 'clinic', ${MOCK_TAG + " Dr Khelifi en congé du 1er au 8 juin — reporter RDV à Dr Bouaziz si possible"}, false, 'Congés')`;

    // ── 13. Reviews (mixed ratings) ────────────────────────────────────────
    log("Reviews…");
    const reviewSpecs = [
      { d: 0, p: 0, rating: 5, p_r: 5, c_r: 5, cl: 5, s: 5, txt: "Médecin très à l'écoute, je recommande." },
      { d: 0, p: 1, rating: 5, p_r: 4, c_r: 5, cl: 5, s: 4, txt: "Excellente prise en charge." },
      { d: 0, p: 2, rating: 4, p_r: 4, c_r: 4, cl: 5, s: 4, txt: "Bon contact, salle d'attente parfois bondée." },
      { d: 1, p: 3, rating: 5, p_r: 5, c_r: 5, cl: 5, s: 5, txt: "Dr Khelifi est exceptionnelle." },
      { d: 1, p: 4, rating: 4, p_r: 3, c_r: 5, cl: 5, s: 4, txt: "Petit retard mais traitement efficace." },
      { d: 2, p: 5, rating: 5, p_r: 5, c_r: 5, cl: 5, s: 5, txt: "Pédiatre fantastique avec mon fils." },
      { d: 2, p: 0, rating: 3, p_r: 2, c_r: 4, cl: 4, s: 3, txt: "Attente trop longue malgré RDV." },
      { d: 0, p: 3, rating: 5, p_r: 5, c_r: 5, cl: 5, s: 5, txt: "Toujours impeccable." },
    ];
    for (const r of reviewSpecs) {
      await sql`INSERT INTO reviews (doctor_id, patient_id, rating, comment, verified, status, punctuality_rating, communication_rating, cleanliness_rating, staff_rating)
        VALUES (${DOCTORS[r.d].id}, ${PATIENTS[r.p]}, ${r.rating}, ${MOCK_TAG + " " + r.txt}, true, 'approved', ${r.p_r}, ${r.c_r}, ${r.cl}, ${r.s})`;
    }

    // ── 14. Bulk SMS campaign history ──────────────────────────────────────
    log("Bulk SMS campaign…");
    await sql`INSERT INTO bulk_sms_campaigns (clinic_id, message, recipient_count, sent_count, failed_count, filter, created_by_clinic_id) VALUES
      (${CLINIC_ID}, ${MOCK_TAG + " Rappel: pensez à votre rendez-vous de contrôle annuel. Pour reprogrammer: doktori.tn"}, 142, 138, 4, ${{ lastVisitBefore: "2025-11-15" }}, ${CLINIC_ID})`;

    // ── 15. Audit log entries ──────────────────────────────────────────────
    log("Audit log…");
    const actions = ["doctor_invite", "note_create", "rdv_status_change", "room_assign", "sms_bulk_send", "site_create", "doctor_invite"];
    for (let i = 0; i < actions.length; i++) {
      await sql`INSERT INTO clinic_audit_log (clinic_id, actor_type, action, target_type, metadata, created_at) VALUES
        (${CLINIC_ID}, 'clinic', ${actions[i]}, 'mock', ${{ mock: "1", note: "Seed data" }}, ${dayOffset(-i, 10 + i, 30)})`;
    }

    // ── 16. Birthday alert: nudge one patient's birthday to today ──────────
    log("Birthday alert…");
    const todayMD = new Date().toISOString().slice(5, 10); // MM-DD
    const oldYear = 1990;
    await sql`UPDATE patients SET date_of_birth=${oldYear + "-" + todayMD} WHERE id=${PATIENTS[1]}`;

    // ── Summary ────────────────────────────────────────────────────────────
    const counts = await sql`SELECT
      (SELECT count(*) FROM appointments WHERE reason LIKE ${MOCK_TAG + "%"}) as appts,
      (SELECT count(*) FROM cnam_claims WHERE notes LIKE ${MOCK_TAG + "%"}) as cnam,
      (SELECT count(*) FROM reviews WHERE comment LIKE ${MOCK_TAG + "%"}) as reviews,
      (SELECT count(*) FROM patient_allergies WHERE reaction LIKE ${MOCK_TAG + "%"}) as allergies,
      (SELECT count(*) FROM patient_vaccinations WHERE notes LIKE ${MOCK_TAG + "%"}) as vaccins,
      (SELECT count(*) FROM patient_analyses WHERE title LIKE ${MOCK_TAG + "%"}) as analyses,
      (SELECT count(*) FROM prescriptions WHERE content LIKE ${MOCK_TAG + "%"}) as rx,
      (SELECT count(*) FROM medical_certificates WHERE title LIKE ${MOCK_TAG + "%"}) as certs,
      (SELECT count(*) FROM patient_documents WHERE title LIKE ${MOCK_TAG + "%"}) as docs,
      (SELECT count(*) FROM lab_orders WHERE instructions LIKE ${MOCK_TAG + "%"}) as lab_orders,
      (SELECT count(*) FROM clinic_invitations WHERE email LIKE 'mock-%') as invitations,
      (SELECT count(*) FROM clinic_notes WHERE body LIKE ${MOCK_TAG + "%"}) as notes,
      (SELECT count(*) FROM bulk_sms_campaigns WHERE message LIKE ${MOCK_TAG + "%"}) as sms_campaigns,
      (SELECT count(*) FROM clinic_audit_log WHERE metadata->>'mock'='1') as audit`;
    console.log("\n✓ Seed complete:");
    console.log(counts[0]);
  } catch (e) {
    console.error("FAIL:", e.message);
    console.error(e);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
