import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventSupportClient } from "@/components/lms/lms-event-support-client";
import { t } from "@/lib/admin-t";

export default async function LmsEventSupportPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/support"
      pageTitle={t("Training Support")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Support") },
      ]}
    >
      <LmsEventSupportClient />
    </LmsLearnerPageShell>
  );
}
