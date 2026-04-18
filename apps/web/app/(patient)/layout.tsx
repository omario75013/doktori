import { PageTransition } from "@/components/page-transition";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
