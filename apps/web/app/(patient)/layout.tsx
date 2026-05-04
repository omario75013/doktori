import { PageTransition } from "@/components/page-transition";
import { PatientShellWrapper } from "@/components/patient-shell-wrapper";
import { OnboardingModal } from "@/components/patient/onboarding-modal";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientShellWrapper>
      <PageTransition>{children}</PageTransition>
      <OnboardingModal />
    </PatientShellWrapper>
  );
}
