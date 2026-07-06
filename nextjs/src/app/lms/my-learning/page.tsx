import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsLearnerContent } from "@/components/lms/lms-learner-experience";
import { LmsMyLearningHubClient } from "@/components/lms/lms-my-learning-hub-client";
import { requireLmsEmployeeLearnerPage } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";

export default async function LmsMyLearningPage() {
  const user = await requireLmsEmployeeLearnerPage("/lms/my-learning");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("My Learning")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("My Learning") },
      ]}
    >
      <LmsLearnerContent>
        <LmsMyLearningHubClient />
      </LmsLearnerContent>
    </LmsAuthenticatedShell>
  );
}
