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
