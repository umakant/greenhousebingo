import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsLearnerContent } from "@/components/lms/lms-learner-experience";
import { LmsStudentDashboardClient } from "@/components/lms/lms-student-dashboard-client";
import { requireLmsEmployeeLearnerPage } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";

export default async function LmsStudentDashboardPage() {
  const user = await requireLmsEmployeeLearnerPage("/lms/student/dashboard");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Student Dashboard")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/my-learning" },
        { label: t("Student Dashboard") },
      ]}
    >
      <LmsLearnerContent>
        <LmsStudentDashboardClient />
      </LmsLearnerContent>
    </LmsAuthenticatedShell>
  );
}
