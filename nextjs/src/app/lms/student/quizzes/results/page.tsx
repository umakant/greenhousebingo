import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentMyResultsClient } from "@/components/lms/lms-student-my-results-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentMyResultsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/quizzes/results"
      pageTitle={t("My Results")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("My Results") },
      ]}
    >
      <LmsStudentMyResultsClient />
    </LmsLearnerPageShell>
  );
}
