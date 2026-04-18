import { DoctorImporter } from "./doctor-importer";

export default function ImportDoctorsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-[1000px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Importer des médecins</h1>
        <p className="text-slate-500 mt-1">
          Importez plusieurs médecins depuis un fichier CSV ou JSON.
        </p>
      </div>
      <DoctorImporter />
    </div>
  );
}
