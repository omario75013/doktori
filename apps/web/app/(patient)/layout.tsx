import { PageTransition } from "@/components/page-transition";
import { PatientShellWrapper } from "@/components/patient-shell-wrapper";
import { OnboardingModal } from "@/components/patient/onboarding-modal";
import { SupportButton } from "@/components/support-button";
import { OfflineBanner } from "@/components/offline-banner";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientShellWrapper>
      <OfflineBanner />
      <PageTransition>{children}</PageTransition>
      <OnboardingModal />
      <SupportButton />
    </PatientShellWrapper>
  );
}
