import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "essentiel",
      name: "Essentiel",
      priceMillimes: 49000, // 49 DT
      description: "Pour les médecins qui démarrent avec la prise de rendez-vous en ligne.",
      features: [
        "Agenda en ligne illimité",
        "Page profil personnalisée sur doktori.tn",
        "Prise de RDV en ligne 24h/24",
        "200 SMS de rappel/mois",
        "Rappels WhatsApp automatiques",
        "Gestion des no-shows (absences)",
        "Fiche patient avec historique",
        "Motifs de consultation personnalisés",
        "Export des rendez-vous (.ics)",
      ],
      notIncluded: [
        "Téléconsultation vidéo",
        "SOS Docteur (urgences à domicile)",
        "SMS illimités",
        "Liste d'attente intelligente",
        "Analytics avancés",
        "Compte secrétaire",
      ],
      teleconsultNote: null,
    },
    {
      id: "pro",
      name: "Pro",
      priceMillimes: 99000, // 99 DT
      popular: true,
      description: "Pour les médecins qui veulent maximiser leur activité et leurs revenus.",
      features: [
        "Tout le plan Essentiel inclus",
        "SMS de rappel illimités",
        "Téléconsultation vidéo intégrée",
        "SOS Docteur (urgences + visites à domicile)",
        "Liste d'attente intelligente",
        "Analytics avancés (stats, tendances)",
        "Compte secrétaire dédié",
        "Ordonnances numériques avec QR code",
        "Gestion multi-cabinets (+29 DT/cabinet)",
        "Support prioritaire",
      ],
      notIncluded: [],
      teleconsultNote: "Commission de 15% sur les téléconsultations et 10% sur les interventions SOS — reversée automatiquement sur votre portefeuille Doktori.",
    },
  ]);
}
