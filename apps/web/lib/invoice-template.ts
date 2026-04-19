export interface InvoiceData {
  invoiceNumber: string; // e.g. FAC-2024-0001
  invoiceDate: Date;
  doctor: {
    name: string;
    email: string;
    address?: string | null;
    city?: string | null;
  };
  subscription: {
    plan: string;
    billingCycle: string;
    startsAt: Date | null;
    endsAt: Date | null;
    priceMillimes: number;
  };
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMillimes(millimes: number): string {
  return (millimes / 1000).toFixed(3).replace(".", ",") + " DT";
}

function planLabel(code: string): string {
  const labels: Record<string, string> = {
    free: "Gratuit",
    essentiel: "Essentiel",
    pro: "Pro",
    clinique: "Clinique",
  };
  return labels[code.toLowerCase()] ?? code;
}

function cycleLabel(cycle: string): string {
  return cycle === "annual" ? "Annuel" : "Mensuel";
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { invoiceNumber, invoiceDate, doctor, subscription } = data;

  const htMillimes = Math.round(subscription.priceMillimes / 1.19);
  const tvaMillimes = subscription.priceMillimes - htMillimes;
  const periodLabel =
    subscription.startsAt || subscription.endsAt
      ? `${formatDate(subscription.startsAt)} — ${formatDate(subscription.endsAt)}`
      : "—";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 14px;
      color: #1a1a1a;
      background: #f5f5f5;
      padding: 32px 16px;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d1d5db;
      padding: 56px 64px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0d6b63;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .logo {
      font-family: Arial, sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #0d6b63;
      letter-spacing: -0.5px;
    }

    .logo span {
      color: #134e4a;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-title {
      font-family: Arial, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #0d6b63;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }

    .invoice-meta p {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.8;
    }

    .invoice-meta strong {
      color: #1a1a1a;
    }

    /* ── Parties ── */
    .parties {
      display: flex;
      gap: 48px;
      margin-bottom: 36px;
    }

    .party {
      flex: 1;
    }

    .party-label {
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9ca3af;
      margin-bottom: 10px;
    }

    .party-name {
      font-size: 15px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 4px;
    }

    .party p {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.7;
    }

    /* ── Table ── */
    .table-section {
      margin-bottom: 32px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #ffffff;
      background: #0d6b63;
      padding: 10px 14px;
      text-align: left;
    }

    thead th:last-child {
      text-align: right;
    }

    tbody td {
      padding: 13px 14px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
      color: #374151;
      vertical-align: top;
    }

    tbody td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .item-description {
      font-weight: bold;
      color: #111827;
      margin-bottom: 3px;
    }

    .item-sub {
      font-size: 12px;
      color: #9ca3af;
    }

    /* ── Totals ── */
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-box {
      width: 280px;
      border: 1px solid #e5e7eb;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 9px 14px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }

    .totals-row:last-child {
      border-bottom: none;
      background: #0d6b63;
      color: #ffffff;
      font-family: Arial, sans-serif;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 14px;
    }

    .totals-row .label { color: inherit; }
    .totals-row .amount { font-variant-numeric: tabular-nums; }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.8;
    }

    .footer strong {
      color: #6b7280;
    }

    /* ── Print ── */
    @media print {
      body { background: white; padding: 0; }
      .page { border: none; padding: 24px 32px; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="logo">Dok<span>tori</span></div>
      <div class="invoice-meta">
        <div class="invoice-title">Facture</div>
        <p><strong>N° :</strong> ${invoiceNumber}</p>
        <p><strong>Date :</strong> ${formatDate(invoiceDate)}</p>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-label">Émetteur</div>
        <div class="party-name">Random Walkers SUARL</div>
        <p>
          RNE : 1625867B<br />
          Matricule fiscal : 1625867/B/A/M/000<br />
          Immeuble Babel Bloc D<br />
          1073 Tunis, Tunisie
        </p>
      </div>
      <div class="party">
        <div class="party-label">Destinataire</div>
        <div class="party-name">Dr. ${doctor.name}</div>
        <p>
          ${doctor.email}
          ${doctor.address ? `<br />${doctor.address}` : ""}
          ${doctor.city ? `<br />${doctor.city}, Tunisie` : ""}
        </p>
      </div>
    </div>

    <!-- Line items -->
    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Période</th>
            <th>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-description">Abonnement Doktori — Plan ${planLabel(subscription.plan)}</div>
              <div class="item-sub">Facturation ${cycleLabel(subscription.billingCycle)}</div>
            </td>
            <td>${periodLabel}</td>
            <td>${formatMillimes(htMillimes)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span class="label">Sous-total HT</span>
          <span class="amount">${formatMillimes(htMillimes)}</span>
        </div>
        <div class="totals-row">
          <span class="label">TVA (19%)</span>
          <span class="amount">${formatMillimes(tvaMillimes)}</span>
        </div>
        <div class="totals-row">
          <span class="label">Total TTC</span>
          <span class="amount">${formatMillimes(subscription.priceMillimes)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>Paiement effectué via Flouci</strong><br />
      Facture générée automatiquement — Doktori par Random Walkers SUARL<br />
      Immeuble Babel Bloc D, 1073 Tunis &nbsp;·&nbsp; RNE 1625867B &nbsp;·&nbsp; MF 1625867/B/A/M/000
    </div>

  </div>
</body>
</html>`;
}
