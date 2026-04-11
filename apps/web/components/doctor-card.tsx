import Link from "next/link";
import { SPECIALTIES, CITIES } from "@doktori/shared";

interface Props {
  doctor: {
    slug: string;
    name: string;
    specialty: string;
    city: string;
    address: string;
    consultationFee: number | null;
    photoUrl: string | null;
  };
}

export function DoctorCard({ doctor }: Props) {
  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <Link href={`/medecin/${doctor.slug}`} className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">
          {doctor.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{doctor.name}</h3>
          <p className="text-blue-600 text-sm">{specialty?.label}</p>
          <p className="text-gray-500 text-sm">{city?.label}</p>
        </div>
        {doctor.consultationFee && (
          <div className="text-right">
            <span className="text-lg font-bold">{doctor.consultationFee / 1000}</span>
            <span className="text-sm text-gray-500"> DT</span>
          </div>
        )}
      </div>
    </Link>
  );
}
