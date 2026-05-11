import Link from "next/link";
import { UserRound } from "lucide-react";

interface Props {
  label: string;
}

/**
 * "Espace médecin" link in the global navbar. Pure server component:
 * the parent Navbar reads the patient cookie and decides whether to render
 * this at all, so there is no client-side flicker.
 */
export function DoctorAreaLink({ label }: Props) {
  return (
    <Link
      href="/connexion"
      aria-label={label}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-white px-2 sm:px-4 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white"
    >
      <UserRound className="h-4 w-4" strokeWidth={2.5} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
