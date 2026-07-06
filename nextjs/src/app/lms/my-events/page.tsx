import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsMyEventsClient } from "@/components/lms/lms-my-events-client";
import { t } from "@/lib/admin-t";

export default async function LmsMyEventsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/my-events"
      pageTitle={t("My Events")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("My Events") },
      ]}
    >
      <LmsMyEventsClient />
    </LmsLearnerPageShell>
  );
}
