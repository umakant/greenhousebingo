import { LmsLearnerExperienceProvider } from "@/components/lms/lms-learner-experience";
import { LmsStudentPortalGate } from "@/components/lms/lms-student-portal-gate";

export default function LmsStudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <LmsLearnerExperienceProvider>
      <LmsStudentPortalGate>{children}</LmsStudentPortalGate>
    </LmsLearnerExperienceProvider>
  );
}
