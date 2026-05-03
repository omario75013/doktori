// TODO: legal team must review/approve this text before W4.5 prod deploy

export function LegalDisclaimer() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>⚠️</strong> Les modèles fournis par Doktori sont des aides à la rédaction.{" "}
      <strong>Le médecin reste seul responsable de la prescription</strong>, des doses,
      et de la pertinence clinique. Adaptez à chaque patient.
    </div>
  );
}
