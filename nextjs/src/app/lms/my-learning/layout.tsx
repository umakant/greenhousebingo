import { LmsLearnerExperienceProvider } from "@/components/lms/lms-learner-experience";

export default function LmsMyLearningLayout({ children }: { children: React.ReactNode }) {
  return <LmsLearnerExperienceProvider>{children}</LmsLearnerExperienceProvider>;
}
