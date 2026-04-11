import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "essentiel",
      name: "Essentiel",
      priceMillimes: 49000, // 49 DT
      features: [
        "Agenda en ligne illimité",
        "200 SMS/mois",
        "Rappels WhatsApp",
        "Gestion no-shows",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      priceMillimes: 99000, // 99 DT
      features: [
        "Tout Essentiel",
        "SMS illimités",
        "SOS Docteur (urgence + domicile)",
        "Liste d'attente intelligente",
        "Analytics avancés",
        "Compte secrétaire",
      ],
    },
  ]);
}
