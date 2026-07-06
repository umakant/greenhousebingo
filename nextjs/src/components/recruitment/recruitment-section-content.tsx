"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Loading = () => (
  <div className="flex items-center justify-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const RecruitmentJobPostingsAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-job-postings-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentCandidatesAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-candidates-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentInterviewsAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-interviews-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentOffersAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-offers-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentOnboardingAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-onboarding-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentSetupAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-setup-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentInterviewFeedbacksAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-interview-feedbacks-admin"),
  { ssr: false, loading: Loading },
);
const RecruitmentCandidateAssessmentsAdmin = dynamic(
  () => import("@/components/recruitment/recruitment-candidate-assessments-admin"),
  { ssr: false, loading: Loading },
);

export function RecruitmentSectionContent({
  section,
  permissions,
}: {
  section: string;
  permissions: string[];
}) {
  switch (section) {
    case "job-postings":
      return <RecruitmentJobPostingsAdmin permissions={permissions} />;
    case "candidates":
      return <RecruitmentCandidatesAdmin permissions={permissions} />;
    case "interview-rounds":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="interview-rounds" />;
    case "interviews":
      return <RecruitmentInterviewsAdmin permissions={permissions} />;
    case "offers":
      return <RecruitmentOffersAdmin permissions={permissions} />;
    case "onboarding":
      return <RecruitmentOnboardingAdmin permissions={permissions} initialTab="onboardings" />;
    case "checklist-items":
      return <RecruitmentOnboardingAdmin permissions={permissions} initialTab="checklists" />;
    case "job-locations":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="job-locations" />;
    case "custom-questions":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="custom-questions" />;
    case "job-types":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="job-types" />;
    case "candidate-sources":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="candidate-sources" />;
    case "interview-types":
      return <RecruitmentSetupAdmin permissions={permissions} initialTab="interview-types" />;
    case "setup":
      return <RecruitmentSetupAdmin permissions={permissions} />;
    case "interview-feedbacks":
      return <RecruitmentInterviewFeedbacksAdmin permissions={permissions} />;
    case "candidate-assessments":
      return <RecruitmentCandidateAssessmentsAdmin permissions={permissions} />;
    default:
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Section &ldquo;{section}&rdquo; not found.</p>
        </div>
      );
  }
}
