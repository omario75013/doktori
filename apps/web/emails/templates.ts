/**
 * Doktori email templates — HTML string builders.
 * Each function returns { subject, html } for use with sendEmail().
 * All templates support locale: "fr" | "ar".
 */

const TEAL = "#0891B2";
const DARK = "#134E4A";
const BG = "#F0FDFA";

function layout(content: string, locale: "fr" | "ar" = "fr"): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const footer = locale === "ar"
    ? "دكتوري — حجز الم��اعيد الطبية في تونس"
    : "Doktori — La prise de rendez-vous médicaux en Tunisie";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG}">
<tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:${TEAL};padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Doktori</h1>
</td></tr>
<tr><td style="padding:32px;color:${DARK};font-size:15px;line-height:1.6">
${content}
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fffe;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function btn(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:${TEAL};border-radius:8px;padding:12px 24px"><a href="${url}" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px">${label}</a></td></tr></table>`;
}

// ─── Booking confirmation (patient) ──────────────────────────────────────────

export function bookingConfirmation(p: {
  locale?: "fr" | "ar";
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  address: string;
  cancelUrl?: string;
}) {
  const locale = p.locale || "fr";
  if (locale === "ar") {
    return {
      subject: `تأكيد الموعد — ${p.doctorName} بتاريخ ${p.date}`,
      html: layout(`
        <p>مرحبا ${p.patientName}،</p>
        <p>تم تأكيد موعدك:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">الطبيب</td><td style="padding:8px;font-weight:600">${p.doctorName} (${p.specialty})</td></tr>
          <tr><td style="padding:8px;color:#6b7280">التاريخ</td><td style="padding:8px;font-weight:600">${p.date}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">الوقت</td><td style="padding:8px;font-weight:600">${p.time}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">العنوان</td><td style="padding:8px">${p.address}</td></tr>
        </table>
        <p>تذكير عبر SMS قبل الموعد بيوم.</p>
        ${p.cancelUrl ? btn("إلغاء الموعد", p.cancelUrl) : ""}
      `, "ar"),
    };
  }
  return {
    subject: `RDV confirmé — ${p.doctorName} le ${p.date}`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p>Votre rendez-vous est confirmé :</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#6b7280">Médecin</td><td style="padding:8px;font-weight:600">${p.doctorName} (${p.specialty})</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px;font-weight:600">${p.date}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Heure</td><td style="padding:8px;font-weight:600">${p.time}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Adresse</td><td style="padding:8px">${p.address}</td></tr>
      </table>
      <p>Un rappel SMS vous sera envoyé la veille.</p>
      ${p.cancelUrl ? btn("Annuler le rendez-vous", p.cancelUrl) : ""}
    `),
  };
}

// ─── Appointment reminder (patient) ──────────────────────────────────────────

export function appointmentReminder(p: {
  locale?: "fr" | "ar";
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  address: string;
  confirmUrl?: string;
  cancelUrl?: string;
  daysAhead: number;
}) {
  const locale = p.locale || "fr";
  const urgency = p.daysAhead <= 1;
  if (locale === "ar") {
    return {
      subject: urgency ? `تذكير: موعدك غداً مع ${p.doctorName}` : `تذكير: موعد قادم مع ${p.doctorName}`,
      html: layout(`
        <p>مرحبا ${p.patientName}،</p>
        <p style="font-size:18px;font-weight:700;color:${TEAL}">${urgency ? "موعدك غداً!" : `موعدك بعد ${p.daysAhead} أيام`}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">الطبيب</td><td style="padding:8px;font-weight:600">${p.doctorName}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">التاريخ</td><td style="padding:8px;font-weight:600">${p.date} الساعة ${p.time}</td></tr>
          <tr><td style="padding:8px;color:#6b7280">العنوان</td><td style="padding:8px">${p.address}</td></tr>
        </table>
        ${p.confirmUrl ? btn("تأكيد الحضور", p.confirmUrl) : ""}
        ${p.cancelUrl ? `<p><a href="${p.cancelUrl}" style="color:#ef4444;font-size:13px">إلغاء الموعد</a></p>` : ""}
      `, "ar"),
    };
  }
  return {
    subject: urgency ? `Rappel : votre RDV demain avec ${p.doctorName}` : `Rappel : RDV à venir avec ${p.doctorName}`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p style="font-size:18px;font-weight:700;color:${TEAL}">${urgency ? "Votre rendez-vous est demain !" : `Votre rendez-vous dans ${p.daysAhead} jours`}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#6b7280">Médecin</td><td style="padding:8px;font-weight:600">${p.doctorName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px;font-weight:600">${p.date} à ${p.time}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Adresse</td><td style="padding:8px">${p.address}</td></tr>
      </table>
      ${p.confirmUrl ? btn("Confirmer ma présence", p.confirmUrl) : ""}
      ${p.cancelUrl ? `<p><a href="${p.cancelUrl}" style="color:#ef4444;font-size:13px">Annuler le rendez-vous</a></p>` : ""}
    `),
  };
}

// ─── Cancellation confirmation (patient) ─────────────────────────────────────

export function cancellationConfirmation(p: {
  locale?: "fr" | "ar";
  patientName: string;
  doctorName: string;
  date: string;
  rebookUrl: string;
}) {
  const locale = p.locale || "fr";
  if (locale === "ar") {
    return {
      subject: `تم إلغاء موعدك مع ${p.doctorName}`,
      html: layout(`
        <p>مرحبا ${p.patientName}،</p>
        <p>تم إلغاء موعدك بتاريخ ${p.date} مع ${p.doctorName}.</p>
        ${btn("إعادة الحجز", p.rebookUrl)}
      `, "ar"),
    };
  }
  return {
    subject: `RDV annulé — ${p.doctorName}`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p>Votre rendez-vous du ${p.date} avec ${p.doctorName} a bien été annulé.</p>
      ${btn("Reprendre un rendez-vous", p.rebookUrl)}
    `),
  };
}

// ─── Review request (patient) ────────────────────────────────────────────────

export function reviewRequest(p: {
  locale?: "fr" | "ar";
  patientName: string;
  doctorName: string;
  reviewUrl: string;
}) {
  const locale = p.locale || "fr";
  if (locale === "ar") {
    return {
      subject: `كيف كانت استشارتك مع ${p.doctorName}؟`,
      html: layout(`
        <p>مرحبا ${p.patientName}،</p>
        <p>كيف كانت زيارتك ل ${p.doctorName}؟ تقييمك يساعد المرضى الآخرين.</p>
        ${btn("تقييم الطبيب", p.reviewUrl)}
      `, "ar"),
    };
  }
  return {
    subject: `Comment s'est passée votre consultation avec ${p.doctorName} ?`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p>Comment s'est passée votre consultation avec ${p.doctorName} ? Votre avis aide les autres patients.</p>
      ${btn("Donner mon avis", p.reviewUrl)}
    `),
  };
}

// ─── New booking notification (doctor) ───────────────────────────────────────

export function newBookingDoctor(p: {
  locale?: "fr" | "ar";
  doctorName: string;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  reason?: string;
  agendaUrl: string;
}) {
  return {
    subject: `Nouveau RDV — ${p.patientName} le ${p.date}`,
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p>Un nouveau rendez-vous a été pris :</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#6b7280">Patient</td><td style="padding:8px;font-weight:600">${p.patientName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Téléphone</td><td style="padding:8px">${p.patientPhone}</td></tr>
        <tr><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px;font-weight:600">${p.date} à ${p.time}</td></tr>
        ${p.reason ? `<tr><td style="padding:8px;color:#6b7280">Motif</td><td style="padding:8px">${p.reason}</td></tr>` : ""}
      </table>
      ${btn("Voir mon agenda", p.agendaUrl)}
    `),
  };
}

// ─── Cancellation notification (doctor) ──────────────────────────────────────

export function cancellationDoctor(p: {
  doctorName: string;
  patientName: string;
  date: string;
  time: string;
}) {
  return {
    subject: `RDV annulé — ${p.patientName} (${p.date})`,
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p>${p.patientName} a annulé son rendez-vous du ${p.date} à ${p.time}.</p>
      <p>Le créneau est de nouveau disponible dans votre agenda.</p>
    `),
  };
}

// ─── Teleconsult link (patient + doctor) ─────────────────────────────────────

export function teleconsultLink(p: {
  locale?: "fr" | "ar";
  recipientName: string;
  otherPartyName: string;
  date: string;
  time: string;
  joinUrl: string;
  minutesUntil?: number;
}) {
  const locale = p.locale || "fr";
  const urgency = p.minutesUntil && p.minutesUntil <= 30;
  if (locale === "ar") {
    return {
      subject: urgency ? `استشارتك عن بعد ${p.minutesUntil ? `بعد ${p.minutesUntil} دقيقة` : "الآن"}` : `استشارة عن بعد — ${p.date}`,
      html: layout(`
        <p>مرحبا ${p.recipientName}،</p>
        <p style="font-size:18px;font-weight:700;color:${TEAL}">${urgency ? `استشارتك تبدأ بعد ${p.minutesUntil} دقيقة` : `استشارتك عن بعد بتاريخ ${p.date}`}</p>
        <p>مع ${p.otherPartyName}</p>
        ${btn("الانضمام", p.joinUrl)}
        <p style="font-size:13px;color:#6b7280">تأكد من الكاميرا والميكروفون واتصال wifi مستقر.</p>
      `, "ar"),
    };
  }
  return {
    subject: urgency ? `Téléconsultation ${p.minutesUntil ? `dans ${p.minutesUntil} min` : "maintenant"}` : `Téléconsultation — ${p.date}`,
    html: layout(`
      <p>Bonjour ${p.recipientName},</p>
      <p style="font-size:18px;font-weight:700;color:${TEAL}">${urgency ? `Votre téléconsultation commence dans ${p.minutesUntil} minutes` : `Votre téléconsultation du ${p.date}`}</p>
      <p>Avec ${p.otherPartyName} à ${p.time}</p>
      ${btn("Rejoindre la consultation", p.joinUrl)}
      <p style="font-size:13px;color:#6b7280">Préparez votre caméra, microphone, et une connexion wifi stable.</p>
    `),
  };
}

// ─── New review notification (doctor) ────────────────────────────────────────

export function newReviewDoctor(p: {
  doctorName: string;
  rating: number;
  reviewsUrl: string;
}) {
  const stars = "★".repeat(p.rating) + "☆".repeat(5 - p.rating);
  return {
    subject: `Nouvel avis patient — ${stars}`,
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p>Un patient a laissé un avis sur votre profil :</p>
      <p style="font-size:24px;color:#f59e0b;letter-spacing:4px">${stars}</p>
      ${btn("Voir mes avis", p.reviewsUrl)}
    `),
  };
}

// ─── Teleconsult receipt (post-consultation, sent to patient) ────────────────

export function buildTeleconsultReceiptEmail(p: {
  patientName: string;
  doctorName: string;
  fee: number; // millimes
  prescriptionUrl: string | null;
  noteUrl: string | null;
  cnamEligible: boolean;
  reviewUrl: string;
}): string {
  const feeDisplay = `${(p.fee / 1000).toFixed(0)} DT`;
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const docLinks = [
    p.prescriptionUrl
      ? btn("Voir mon ordonnance", p.prescriptionUrl)
      : "",
    p.noteUrl
      ? btn("Voir le compte-rendu", p.noteUrl)
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const cnamSection = p.cnamEligible
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-weight:700;color:#166534">Remboursement CNAM</p>
        <p style="margin:8px 0 0;color:#166534;font-size:14px">Votre consultation peut être remboursée par la CNAM. Votre médecin a initié une demande de remboursement en votre nom.</p>
      </div>`
    : "";

  return layout(`
    <p>Bonjour ${p.patientName},</p>
    <p style="font-size:18px;font-weight:700;color:${TEAL}">Votre téléconsultation est terminée</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;color:#6b7280">Médecin</td><td style="padding:8px;font-weight:600">Dr. ${p.doctorName}</td></tr>
      <tr><td style="padding:8px;color:#6b7280">Date</td><td style="padding:8px;font-weight:600">${today}</td></tr>
      <tr><td style="padding:8px;color:#6b7280">Montant payé</td><td style="padding:8px;font-weight:600">${feeDisplay} (via Doktori)</td></tr>
    </table>

    ${docLinks.length > 0 ? `<p style="font-weight:600;color:${DARK}">Vos documents :</p>${docLinks}` : ""}

    ${cnamSection}

    ${btn("Donner votre avis", p.reviewUrl)}

    <p style="font-size:13px;color:#6b7280;margin-top:24px">Merci d'avoir choisi Doktori pour votre suivi médical.</p>
  `);
}

// ─── Prescription email (patient) ────────────────────────────────────────────

export function buildPrescriptionEmail(p: {
  patientName: string;
  doctorName: string;
  content: string;
  prescriptionUrl: string;
}): string {
  // Convert newlines to <br> for HTML display
  const formattedContent = p.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return layout(`
    <p>Bonjour ${p.patientName},</p>
    <p style="font-size:18px;font-weight:700;color:${TEAL}">Votre ordonnance est disponible</p>
    <p>Dr. ${p.doctorName} vous a transmis une ordonnance suite à votre consultation.</p>

    <div style="background:#f8fffe;border:1px solid #e6f4f1;border-radius:8px;padding:20px;margin:20px 0;font-family:monospace;font-size:14px;line-height:1.8;color:${DARK}">
      ${formattedContent}
    </div>

    ${btn("Voir l'ordonnance complète", p.prescriptionUrl)}

    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Conservez ce document et présentez-le en pharmacie.
      En cas de questions, contactez votre médecin directement.
    </p>
  `);
}

// ─── CNAM dossier email (patient) ─────────────────────────────────────────────

const CNAM_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis à la CNAM",
  approved: "Approuvé",
  reimbursed: "Remboursé",
  rejected: "Refusé",
};

export function buildCnamEmail(p: {
  patientName: string;
  doctorName: string;
  cnamNumber: string;
  amount: number; // millimes
  consultationDate: string;
  status: string;
}): string {
  const amountDisplay = `${(p.amount / 1000).toFixed(3)} DT`;
  const statusLabel = CNAM_STATUS_LABELS[p.status] ?? p.status;
  const dateDisplay = new Date(p.consultationDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return layout(`
    <p>Bonjour ${p.patientName},</p>
    <p style="font-size:18px;font-weight:700;color:${TEAL}">Votre bordereau CNAM</p>
    <p>Dr. ${p.doctorName} vous a envoyé votre fiche CNAM pour remboursement.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr style="background:#f8fffe">
        <td style="padding:12px;color:#6b7280;border:1px solid #e6f4f1">Numéro CNAM</td>
        <td style="padding:12px;font-weight:600;border:1px solid #e6f4f1">${p.cnamNumber}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;border:1px solid #e6f4f1">Date de consultation</td>
        <td style="padding:12px;font-weight:600;border:1px solid #e6f4f1">${dateDisplay}</td>
      </tr>
      <tr style="background:#f8fffe">
        <td style="padding:12px;color:#6b7280;border:1px solid #e6f4f1">Montant</td>
        <td style="padding:12px;font-weight:600;border:1px solid #e6f4f1">${amountDisplay}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;border:1px solid #e6f4f1">Statut</td>
        <td style="padding:12px;font-weight:600;border:1px solid #e6f4f1">${statusLabel}</td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#166534">Remboursement CNAM</p>
      <p style="margin:8px 0 0;color:#166534;font-size:14px">
        Ce bordereau atteste de votre consultation. Votre médecin le soumettra à la CNAM pour traitement.
        Conservez ce document comme justificatif.
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280;margin-top:24px">
      Pour toute question sur le remboursement, rapprochez-vous de votre caisse CNAM locale.
    </p>
  `);
}

// ─── Doctor re-engagement ─────────────────────────────────────────────────────

export function buildReengagementEmail(p: { doctorName: string }): { subject: string; html: string } {
  return {
    subject: "Vos patients vous attendent !",
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p style="font-size:18px;font-weight:700;color:${TEAL}">Vos patients vous attendent !</p>
      <p>Vous n'avez pas reçu de rendez-vous depuis 30 jours. Voici <strong>3 astuces</strong> pour augmenter votre visibilité sur Doktori :</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr>
          <td style="padding:12px 16px;border-left:4px solid ${TEAL};background:#f8fffe;margin-bottom:8px;display:block">
            <strong style="color:${DARK}">1. Complétez votre profil</strong>
            <p style="margin:4px 0 0;font-size:14px;color:#6b7280">Un profil complet avec photo obtient 3× plus de rendez-vous. Ajoutez votre biographie, vos diplômes et vos spécialités.</p>
          </td>
        </tr>
        <tr><td style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px 16px;border-left:4px solid ${TEAL};background:#f8fffe">
            <strong style="color:${DARK}">2. Activez la téléconsultation</strong>
            <p style="margin:4px 0 0;font-size:14px;color:#6b7280">Les médecins avec téléconsultation reçoivent 40% de demandes supplémentaires. Élargissez votre zone de couverture géographique.</p>
          </td>
        </tr>
        <tr><td style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px 16px;border-left:4px solid ${TEAL};background:#f8fffe">
            <strong style="color:${DARK}">3. Partagez votre lien Doktori</strong>
            <p style="margin:4px 0 0;font-size:14px;color:#6b7280">Ajoutez votre lien de réservation dans votre signature email et sur vos réseaux sociaux pour que vos patients puissent vous trouver facilement.</p>
          </td>
        </tr>
      </table>
      ${btn("Mettre à jour mon profil", "https://doktori.tn/espace-medecin")}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Besoin d'aide ? Contactez notre équipe support à <a href="mailto:support@doktori.tn" style="color:${TEAL}">support@doktori.tn</a></p>
    `),
  };
}

// ─── Cancellation follow-up (patient) ────────────────────────────────────────

export function buildCancellationFollowupEmail(p: {
  patientName: string;
  doctorName: string;
  doctorSlug: string;
}): { subject: string; html: string } {
  const rebookUrl = `https://doktori.tn/rdv/${p.doctorSlug}`;
  return {
    subject: `Souhaitez-vous reprogrammer votre RDV avec Dr. ${p.doctorName} ?`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p>Nous avons remarqué que vous avez annulé votre rendez-vous avec <strong>Dr. ${p.doctorName}</strong>.</p>
      <p>Souhaitez-vous reprogrammer ? Il est toujours disponible pour vous recevoir.</p>
      ${btn("Reprendre rendez-vous", rebookUrl)}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">
        Si l'annulation était intentionnelle, vous n'avez rien à faire.<br>
        Nous restons disponibles si vous avez besoin de prendre un autre rendez-vous.
      </p>
    `),
  };
}

// ─── Trial expiry warning (doctor) ───────────────────────────────────────────

export function buildTrialExpiryWarningEmail(p: {
  doctorName: string;
  daysLeft: number;
  planUrl?: string;
  trialEndDate?: string;
}): { subject: string; html: string } {
  return {
    subject: `Votre période d'essai expire dans ${p.daysLeft} jour${p.daysLeft > 1 ? "s" : ""}`,
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p style="font-size:18px;font-weight:700;color:#f59e0b">Votre période d'essai expire bientôt</p>
      <p>Il vous reste <strong>${p.daysLeft} jour${p.daysLeft > 1 ? "s" : ""}</strong> sur votre période d'essai gratuite.</p>
      <p>Pour continuer à recevoir des rendez-vous et utiliser toutes les fonctionnalités de Doktori, choisissez un plan adapté à votre pratique.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-weight:600;color:#92400e">Ne perdez pas vos patients !</p>
        <p style="margin:8px 0 0;font-size:14px;color:#92400e">En choisissant un plan maintenant, votre profil reste visible et vos patients peuvent continuer à prendre rendez-vous.</p>
      </div>
      ${btn("Choisir mon plan", p.planUrl || "https://doktori.tn/abonnement")}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Des questions ? Écrivez-nous à <a href="mailto:support@doktori.tn" style="color:${TEAL}">support@doktori.tn</a></p>
    `),
  };
}

// ─── Subscription expired (doctor) ───────────────────────────────────────────

export function buildSubscriptionExpiredEmail(p: {
  doctorName: string;
}): { subject: string; html: string } {
  return {
    subject: "Votre abonnement Doktori a expiré",
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p style="font-size:18px;font-weight:700;color:#ef4444">Votre abonnement a expiré</p>
      <p>Votre abonnement Doktori n'est plus actif. Votre profil n'est plus visible par les patients.</p>
      <p>Réactivez votre abonnement dès maintenant pour :</p>
      <ul style="color:${DARK};line-height:1.8">
        <li>Réapparaître dans les résultats de recherche</li>
        <li>Recevoir de nouveaux rendez-vous</li>
        <li>Accéder à toutes vos données patients</li>
        <li>Utiliser la téléconsultation</li>
      </ul>
      ${btn("Réactiver mon abonnement", "https://doktori.tn/espace-medecin/abonnement")}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Besoin d'aide ? Contactez <a href="mailto:support@doktori.tn" style="color:${TEAL}">support@doktori.tn</a></p>
    `),
  };
}

// ─── Review reminder retry (patient) ─────────────────────────────────────────

export function buildReviewReminderRetryEmail(p: {
  patientName: string;
  doctorName: string;
  reviewUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Votre avis compte ! Notez Dr. ${p.doctorName}`,
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p style="font-size:18px;font-weight:700;color:${TEAL}">Votre avis compte !</p>
      <p>Prenez 30 secondes pour noter votre consultation avec <strong>Dr. ${p.doctorName}</strong>.</p>
      <p>Votre témoignage aide des milliers de patients à choisir le bon médecin. C'est simple, rapide et très utile.</p>
      <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0;font-size:32px;letter-spacing:8px">⭐⭐⭐⭐⭐</p>
        <p style="margin:8px 0 0;font-size:14px;color:#0f766e">Cliquez ci-dessous pour noter en 30 secondes</p>
      </div>
      ${btn("Donner mon avis maintenant", p.reviewUrl)}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">
        Si vous avez déjà laissé un avis, merci et ignorez ce message.
      </p>
    `),
  };
}

// ─── Welcome patient ─────────────────────────────────────────────────────────

export function welcomePatient(p: {
  locale?: "fr" | "ar";
  patientName: string;
}) {
  const locale = p.locale || "fr";
  if (locale === "ar") {
    return {
      subject: "مرحبا بك في دكتوري!",
      html: layout(`
        <p>مرحبا ${p.patientName}،</p>
        <p>مرحبا بك في دكتوري! تم تأكيد موعدك الأول.</p>
        <p>مع دكتوري يمكنك:</p>
        <ul>
          <li>حجز مواعيد طبية في أي وقت</li>
          <li>إدارة مواعيدك عبر الإنترنت</li>
          <li>استلام تذكيرات تلقائية</li>
          <li>استشارات عن بعد مع أطبائك</li>
        </ul>
        ${btn("إكمال ملفي الطبي", "https://doktori.tn/dossier-medical")}
      `, "ar"),
    };
  }
  return {
    subject: "Bienvenue sur Doktori !",
    html: layout(`
      <p>Bonjour ${p.patientName},</p>
      <p>Bienvenue sur Doktori ! Votre premier rendez-vous est confirmé.</p>
      <p>Avec Doktori, vous pouvez :</p>
      <ul>
        <li>Prendre rendez-vous 24h/24</li>
        <li>Gérer vos rendez-vous en ligne</li>
        <li>Recevoir des rappels automatiques</li>
        <li>Consulter vos médecins en téléconsultation</li>
      </ul>
      ${btn("Compléter mon dossier médical", "https://doktori.tn/dossier-medical")}
    `),
  };
}

// ── Doctor Email Verification ────────────────────────────────────────────────
export function buildDoctorEmailVerificationEmail(p: {
  doctorName: string;
  verificationUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Vérifiez votre adresse email — Doktori",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0891B2,#134E4A);padding:32px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:28px">Vérifiez votre email</h1>
      </div>
      <div style="padding:32px;background:white;border:1px solid #E6F4F1;border-radius:0 0 16px 16px">
        <p style="font-size:16px;color:#134E4A">Bonjour Dr. ${p.doctorName},</p>
        <p style="color:#5E7574">Pour finaliser votre inscription sur Doktori, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${p.verificationUrl}" style="display:inline-block;background:#0891B2;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">Confirmer mon email</a>
        </div>
        <p style="color:#94A3B8;font-size:13px">Ce lien est valable 48 heures. Si vous n'avez pas créé de compte sur Doktori, vous pouvez ignorer cet email.</p>
      </div>
    </div>`,
  };
}

// ── Staff Password Reset (doctor | clinic | lab | lab_user | secretary) ─────
export function buildStaffPasswordResetEmail(p: {
  recipientName: string;
  actorLabel: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Réinitialisation de votre mot de passe — Doktori",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0891B2,#134E4A);padding:32px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:26px">Réinitialisation du mot de passe</h1>
      </div>
      <div style="padding:32px;background:white;border:1px solid #E6F4F1;border-radius:0 0 16px 16px">
        <p style="font-size:16px;color:#134E4A">Bonjour ${p.recipientName},</p>
        <p style="color:#5E7574">Vous avez demandé à réinitialiser le mot de passe de votre espace <strong>${p.actorLabel}</strong> sur Doktori.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${p.resetUrl}" style="display:inline-block;background:#0891B2;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px">Réinitialiser mon mot de passe</a>
        </div>
        <p style="color:#94A3B8;font-size:13px">Ce lien est valable <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.</p>
      </div>
    </div>`,
    text: `Bonjour ${p.recipientName},\n\nLien de réinitialisation (espace ${p.actorLabel}) :\n${p.resetUrl}\n\nCe lien expire dans 1 heure.`,
  };
}

// ── Doctor Welcome (sent after registration with trial) ─────────────────────
export function buildDoctorWelcomeEmail(p: { doctorName: string; trialEndDate: string }): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#0891B2,#134E4A);padding:32px;text-align:center;border-radius:16px 16px 0 0">
      <h1 style="color:white;margin:0;font-size:28px">Bienvenue sur Doktori !</h1>
    </div>
    <div style="padding:32px;background:white;border:1px solid #E6F4F1;border-radius:0 0 16px 16px">
      <p style="font-size:16px;color:#134E4A">Bonjour Dr. ${p.doctorName},</p>
      <p style="color:#5E7574">Votre espace médecin est prêt ! Vous bénéficiez de <strong>2 mois d'essai gratuit</strong> jusqu'au ${p.trialEndDate}.</p>
      <h3 style="color:#134E4A">Pour bien démarrer :</h3>
      <ol style="color:#5E7574;line-height:2">
        <li>Complétez votre profil et ajoutez une photo</li>
        <li>Configurez vos horaires dans l'Agenda</li>
        <li>Ajoutez vos motifs de consultation</li>
        <li>Activez la téléconsultation si vous le souhaitez</li>
      </ol>
      <a href="https://doktori.tn/dashboard" style="display:inline-block;background:#0891B2;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px">Accéder à mon espace</a>
      <p style="color:#94A3B8;font-size:13px;margin-top:24px">Votre essai gratuit expire le ${p.trialEndDate}. Après cette date, choisissez un abonnement pour rester visible.</p>
    </div>
  </div>`;
}

// ── Trial expired today ─────────────────────────────────────────────────────
export function buildTrialExpiredTodayEmail(p: { doctorName: string }): { subject: string; html: string } {
  return {
    subject: "Votre essai gratuit a expiré",
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#DC2626;padding:24px;text-align:center;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">Votre essai a expiré</h1>
      </div>
      <div style="padding:32px;background:white;border:1px solid #E6F4F1;border-radius:0 0 16px 16px">
        <p style="color:#134E4A">Dr. ${p.doctorName},</p>
        <p style="color:#5E7574">Votre période d'essai gratuit est terminée. Vos patients ne peuvent plus vous trouver sur Doktori.</p>
        <p style="color:#5E7574">Pour rester visible et continuer à recevoir des rendez-vous :</p>
        <a href="https://doktori.tn/abonnement" style="display:inline-block;background:#0891B2;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:12px">Choisir mon abonnement</a>
      </div>
    </div>`,
  };
}

// ─── No-show warning email (patient, before ban) ──────────────────────────────

const AMBER = "#D97706";
const AMBER_BG = "#FFFBEB";
const AMBER_BORDER = "#FDE68A";

function warningLayout(content: string): string {
  return `<!DOCTYPE html>
<html dir="ltr" lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${AMBER_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${AMBER_BG}">
<tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:2px solid ${AMBER_BORDER}">
<tr><td style="background:${AMBER};padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Doktori</h1>
</td></tr>
<tr><td style="padding:32px;color:#134E4A;font-size:15px;line-height:1.6">
${content}
</td></tr>
<tr><td style="padding:16px 32px;background:#fffbeb;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid ${AMBER_BORDER}">
Doktori — La prise de rendez-vous médicaux en Tunisie
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const RED_ALERT = "#DC2626";
const RED_BG = "#FEF2F2";
const RED_BORDER = "#FECACA";

function suspensionLayout(content: string): string {
  return `<!DOCTYPE html>
<html dir="ltr" lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${RED_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${RED_BG}">
<tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:2px solid ${RED_BORDER}">
<tr><td style="background:${RED_ALERT};padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Doktori</h1>
</td></tr>
<tr><td style="padding:32px;color:#134E4A;font-size:15px;line-height:1.6">
${content}
</td></tr>
<tr><td style="padding:16px 32px;background:#fef2f2;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid ${RED_BORDER}">
Doktori — La prise de rendez-vous médicaux en Tunisie
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function buildNoShowWarningEmail(p: {
  patientName: string;
  doctorName: string;
  noShowCount: number;
  threshold: number;
}): { subject: string; html: string } {
  const remaining = p.threshold - p.noShowCount;
  return {
    subject: `Avertissement : absence non justifiée — ${p.noShowCount}/${p.threshold}`,
    html: warningLayout(`
      <p>Bonjour ${p.patientName},</p>
      <p style="font-size:16px;font-weight:700;color:${AMBER}">Absence non justifiée enregistrée</p>
      <p>Vous avez été marqué(e) absent(e) à votre rendez-vous avec <strong>${p.doctorName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fffbeb;border-radius:8px;border:1px solid ${AMBER_BORDER}">
        <tr>
          <td style="padding:12px 16px;color:#92400e;font-weight:600">Absences enregistrées</td>
          <td style="padding:12px 16px;font-weight:700;color:${AMBER};font-size:18px">${p.noShowCount} / ${p.threshold}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#92400e;font-weight:600">Absences restantes avant suspension</td>
          <td style="padding:12px 16px;font-weight:700;color:#134E4A">${remaining}</td>
        </tr>
      </table>
      <p style="color:#92400e;background:#fef3c7;border-left:4px solid ${AMBER};padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
        <strong>Attention :</strong> Après <strong>${p.threshold} absences non justifiées</strong>, votre compte sera temporairement suspendu pendant 30 jours.
      </p>
      <p>Si cette absence est une erreur, veuillez contacter le cabinet directement.</p>
    `),
  };
}

export function buildNoShowSuspensionEmail(p: {
  patientName: string;
  noShowCount: number;
  threshold: number;
  unbanDate: string;
}): { subject: string; html: string } {
  return {
    subject: "Compte Doktori temporairement suspendu",
    html: suspensionLayout(`
      <p>Bonjour ${p.patientName},</p>
      <p style="font-size:16px;font-weight:700;color:${RED_ALERT}">Votre compte a été temporairement suspendu</p>
      <p>Suite à <strong>${p.noShowCount} absences non justifiées</strong>, votre accès aux réservations sur Doktori a été suspendu.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fef2f2;border-radius:8px;border:1px solid ${RED_BORDER}">
        <tr>
          <td style="padding:12px 16px;color:#991b1b;font-weight:600">Raison</td>
          <td style="padding:12px 16px;font-weight:600">${p.noShowCount} absences non justifiées</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#991b1b;font-weight:600">Levée automatique</td>
          <td style="padding:12px 16px;font-weight:600">Le ${p.unbanDate}</td>
        </tr>
      </table>
      <p style="color:#991b1b;background:#fee2e2;border-left:4px solid ${RED_ALERT};padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">
        Vous pourrez à nouveau prendre des rendez-vous à partir du <strong>${p.unbanDate}</strong>.
      </p>
      <p>Pour contester cette décision ou si vous pensez qu'il s'agit d'une erreur, contactez-nous à <a href="mailto:contact@doktori.tn" style="color:${RED_ALERT}">contact@doktori.tn</a>.</p>
    `),
  };
}

// ── Doctor Verification: Pending ────────────────────────────────────────────

export function buildVerificationPendingEmail(p: {
  doctorName: string;
  uploadUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Bienvenue sur Doktori — Activez votre profil",
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p>Votre compte Doktori a été créé avec succès !</p>
      <p>Pour activer votre profil et apparaître dans les résultats de recherche, vous devez téléverser vos documents de vérification :</p>
      <ul style="color:#5E7574;line-height:2;padding-left:20px">
        <li>Diplôme de médecine</li>
        <li>Carte d'inscription au CNOM</li>
        <li>CIN ou passeport</li>
      </ul>
      <p>Votre profil sera activé après vérification de vos documents par notre équipe (généralement sous 24-48h).</p>
      ${btn("Téléverser mes documents", p.uploadUrl)}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">En attendant, vous pouvez configurer votre agenda, ajouter vos motifs de consultation et explorer votre espace médecin.</p>
    `),
  };
}

// ── Doctor Verification: Approved ──────────────────────────────────────────

export function buildVerificationApprovedEmail(p: {
  doctorName: string;
  profileUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Votre compte Doktori est vérifié !",
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p style="font-size:18px;font-weight:700;color:${TEAL}">Félicitations ! Votre compte est maintenant vérifié.</p>
      <p>Votre profil est désormais visible sur doktori.tn et vous pouvez recevoir des demandes de rendez-vous de vos patients.</p>
      <ul style="color:#5E7574;line-height:2;padding-left:20px">
        <li>Votre profil apparaît dans les résultats de recherche</li>
        <li>Les patients peuvent prendre rendez-vous en ligne</li>
        <li>Vous profitez de 2 mois d'essai gratuit</li>
      </ul>
      ${btn("Voir mon profil", p.profileUrl)}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Merci de faire confiance à Doktori pour le développement de votre pratique médicale.</p>
    `),
  };
}

// ── Doctor Verification: Rejected ──────────────────────────────────────────

export function buildVerificationRejectedEmail(p: {
  doctorName: string;
  reason: string;
  uploadUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Documents refusés — Action requise",
    html: layout(`
      <p>Bonjour Dr. ${p.doctorName},</p>
      <p>Nous avons examiné vos documents et malheureusement nous ne pouvons pas les accepter pour la raison suivante :</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;color:#991b1b;font-weight:600">${p.reason}</p>
      </div>
      <p>Pour activer votre profil, veuillez soumettre de nouveaux documents conformes à nos exigences :</p>
      <ul style="color:#5E7574;line-height:2;padding-left:20px">
        <li>Diplôme de médecine lisible et complet</li>
        <li>Carte d'inscription au CNOM en cours de validité</li>
        <li>CIN ou passeport valide</li>
      </ul>
      ${btn("Soumettre de nouveaux documents", p.uploadUrl)}
      <p style="font-size:13px;color:#6b7280;margin-top:24px">Pour toute question, contactez-nous à <a href="mailto:contact@doktori.tn" style="color:${TEAL}">contact@doktori.tn</a>.</p>
    `),
  };
}
