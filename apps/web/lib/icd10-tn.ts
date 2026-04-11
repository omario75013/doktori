export interface Icd10Code {
  code: string;
  label: string;
  category: string;
}

export const ICD10_TN: Icd10Code[] = [
  // Maladies cardiovasculaires
  { code: "I10", label: "Hypertension artérielle essentielle", category: "Cardiovasculaire" },
  { code: "I20", label: "Angine de poitrine", category: "Cardiovasculaire" },
  { code: "I21", label: "Infarctus aigu du myocarde", category: "Cardiovasculaire" },
  { code: "I25", label: "Cardiopathie ischémique chronique", category: "Cardiovasculaire" },
  { code: "I50", label: "Insuffisance cardiaque", category: "Cardiovasculaire" },
  { code: "I63", label: "Infarctus cérébral", category: "Cardiovasculaire" },
  { code: "I83", label: "Varices des membres inférieurs", category: "Cardiovasculaire" },

  // Maladies métaboliques
  { code: "E11", label: "Diabète de type 2", category: "Métabolique" },
  { code: "E10", label: "Diabète de type 1", category: "Métabolique" },
  { code: "E66", label: "Obésité", category: "Métabolique" },
  { code: "E78.5", label: "Hyperlipidémie mixte / dyslipidémie", category: "Métabolique" },
  { code: "E78.0", label: "Hypercholestérolémie pure", category: "Métabolique" },
  { code: "E11.65", label: "Diabète de type 2 avec hyperglycémie", category: "Métabolique" },
  { code: "E04", label: "Goitre non toxique", category: "Métabolique" },
  { code: "E05", label: "Thyrotoxicose (hyperthyroïdie)", category: "Métabolique" },
  { code: "E03", label: "Hypothyroïdie", category: "Métabolique" },

  // Maladies respiratoires
  { code: "J45", label: "Asthme", category: "Respiratoire" },
  { code: "J06", label: "Infections aiguës des voies respiratoires supérieures", category: "Respiratoire" },
  { code: "J18", label: "Pneumonie, sans précision", category: "Respiratoire" },
  { code: "J44", label: "Bronchopneumopathie chronique obstructive (BPCO)", category: "Respiratoire" },
  { code: "J00", label: "Rhinite aiguë (rhume commun)", category: "Respiratoire" },
  { code: "J03", label: "Amygdalite aiguë", category: "Respiratoire" },

  // Maladies digestives
  { code: "K21", label: "Maladie de reflux gastro-œsophagien (RGO)", category: "Digestif" },
  { code: "K29", label: "Gastrite et duodénite", category: "Digestif" },
  { code: "K57", label: "Maladie diverticulaire du côlon", category: "Digestif" },
  { code: "K80", label: "Lithiase biliaire (cholélithiase)", category: "Digestif" },
  { code: "K92", label: "Autres maladies du système digestif", category: "Digestif" },
  { code: "K59.0", label: "Constipation", category: "Digestif" },

  // Maladies infectieuses
  { code: "A09", label: "Diarrhée et gastroentérite infectieuse", category: "Infectieux" },
  { code: "A41", label: "Septicémie", category: "Infectieux" },
  { code: "B34", label: "Infection virale, sans précision", category: "Infectieux" },
  { code: "A15", label: "Tuberculose respiratoire", category: "Infectieux" },
  { code: "B50", label: "Paludisme à Plasmodium falciparum", category: "Infectieux" },

  // Gynéco-obstétriques
  { code: "O80", label: "Accouchement normal", category: "Gynéco-obstétrique" },
  { code: "N91", label: "Aménorrhée", category: "Gynéco-obstétrique" },
  { code: "N93", label: "Autres saignements utérins ou vaginaux anormaux", category: "Gynéco-obstétrique" },
  { code: "O10", label: "Hypertension préexistante compliquant la grossesse", category: "Gynéco-obstétrique" },
  { code: "N80", label: "Endométriose", category: "Gynéco-obstétrique" },

  // Pédiatriques
  { code: "P07", label: "Troubles liés à une courte durée de gestation (prématurité)", category: "Pédiatrique" },
  { code: "J20", label: "Bronchite aiguë", category: "Pédiatrique" },
  { code: "A08", label: "Gastroentérite virale", category: "Pédiatrique" },

  // Santé mentale
  { code: "F32", label: "Épisode dépressif", category: "Santé mentale" },
  { code: "F41", label: "Autres troubles anxieux", category: "Santé mentale" },
  { code: "F10", label: "Troubles mentaux et du comportement liés à l'alcool", category: "Santé mentale" },

  // ORL
  { code: "H66", label: "Otite moyenne suppurée", category: "ORL" },
  { code: "J32", label: "Sinusite chronique", category: "ORL" },
  { code: "H91", label: "Autres pertes d'audition", category: "ORL" },

  // Dermatologie
  { code: "L29", label: "Prurit", category: "Dermatologie" },
  { code: "L40", label: "Psoriasis", category: "Dermatologie" },
  { code: "L23", label: "Dermatite allergique de contact", category: "Dermatologie" },

  // Ostéo-articulaires
  { code: "M54", label: "Dorsalgie / lombalgie", category: "Ostéo-articulaire" },
  { code: "M16", label: "Coxarthrose (arthrose de la hanche)", category: "Ostéo-articulaire" },
  { code: "M17", label: "Gonarthrose (arthrose du genou)", category: "Ostéo-articulaire" },
  { code: "M10", label: "Goutte", category: "Ostéo-articulaire" },

  // Divers
  { code: "D50", label: "Anémie ferriprive", category: "Hématologie" },
  { code: "R50", label: "Fièvre d'origine inconnue", category: "Divers" },
  { code: "R51", label: "Céphalée", category: "Divers" },
];

export function searchIcd10(query: string): Icd10Code[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return ICD10_TN.filter(
    (entry) =>
      entry.code.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
  ).slice(0, 10);
}
