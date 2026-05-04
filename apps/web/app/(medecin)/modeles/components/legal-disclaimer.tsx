/**
 * Legal disclaimer for prescription templates.
 *
 * Texte aligné sur :
 * - Loi n° 91-21 du 13 mars 1991 relative à l'exercice et l'organisation
 *   des professions de médecin et de médecin dentiste (Tunisie)
 * - Code de déontologie médicale tunisien (décret n° 93-1155, art. 35)
 *   sur la responsabilité personnelle du praticien dans la prescription
 * - RGPD / loi tunisienne 2004-63 sur la protection des données à caractère personnel
 */
export function LegalDisclaimer() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-start gap-2">
        <span aria-hidden="true">⚠️</span>
        <span>
          Les modèles fournis par Doktori sont des <strong>aides à la rédaction</strong>{" "}
          mises à disposition des praticiens. Conformément à l&apos;article 35 du
          Code de déontologie médicale tunisien,{" "}
          <strong>
            le médecin demeure seul responsable de la prescription qu&apos;il signe
          </strong>{" "}
          : posologies, indications, contre-indications, interactions et adaptation
          au patient relèvent de son seul jugement clinique.
        </span>
      </p>
    </div>
  );
}
