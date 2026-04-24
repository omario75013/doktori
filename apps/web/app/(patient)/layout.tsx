import { PageTransition } from "@/components/page-transition";
import { PatientShellWrapper } from "@/components/patient-shell-wrapper";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientShellWrapper>
      <PageTransition>{children}</PageTransition>
    </PatientShellWrapper>
  );
}
