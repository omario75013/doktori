import { DoctorCard } from "./doctor-card";
import { PremiumBadge } from "./premium-badge";

interface PremiumDoctorCardProps {
  doctor: {
    slug: string;
    name: string;
    specialty: string;
    city: string;
    address: string;
    consultationFee: number | null;
    photoUrl: string | null;
  };
  isPremium?: boolean;
}

export function PremiumDoctorCard({ doctor, isPremium = false }: PremiumDoctorCardProps) {
  if (!isPremium) {
    return <DoctorCard doctor={doctor} />;
  }

  return (
    <div className="relative ring-2 ring-amber-400 ring-offset-1 rounded-xl shadow-amber-100 shadow-md">
      <div className="absolute -top-3 left-4 z-10">
        <PremiumBadge size="sm" />
      </div>
      <DoctorCard doctor={doctor} />
    </div>
  );
}
